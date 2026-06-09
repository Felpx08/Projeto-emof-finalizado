// ============================================================
// Ordem.js — Model de Ordem de Produção (FactoryTrack)
// ============================================================

const { ready, query, run, get } = require('../database/sqlite');

// Query base reutilizada nas buscas: une ordens com dados do cliente
const SELECT_ORDEM = `
  SELECT
    o.*,
    c.nome     AS cliente_nome,
    c.telefone AS cliente_telefone
  FROM ordens o
  LEFT JOIN clientes c ON c.id = o.cliente_id
`;

/**
 * Transforma uma linha do banco (+ itens) no formato que o front-end espera.
 * Os itens são passados separadamente pois vêm de uma segunda query.
 */
function formatarOrdem(row, itens = []) {
  if (!row) return null;
  return {
    _id:            row.id,
    id:             row.id,
    numeroOrdem:    row.numero_ordem,
    cliente: {
      _id:      row.cliente_id,
      id:       row.cliente_id,
      nome:     row.cliente_nome,
      telefone: row.cliente_telefone,
    },
    itens: itens.map(it => ({
      _id:           it.id,
      produto:       it.produto_id,
      nomeProduto:   it.nome_produto,
      quantidade:    it.quantidade,
      precoUnitario: it.preco_unitario,
      subtotal:      it.subtotal,
    })),
    subtotal:       row.subtotal,
    total:          row.total,
    formaPagamento: row.forma_pagamento,
    status:         row.status,
    observacoes:    row.observacoes,
    prazo:          row.prazo,
    origem:         row.origem,
    lider:          row.lider_id,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  };
}

const Ordem = {

  /**
   * Retorna todas as ordens com seus itens.
   * Se `liderId` for informado, filtra apenas as ordens daquele líder
   * (usado na tela de Produção para líderes de chão de fábrica).
   */
  async findAll({ liderId } = {}) {
    await ready;
    let rows;
    if (liderId) {
      rows = query(`${SELECT_ORDEM} WHERE o.lider_id = ? ORDER BY o.created_at DESC`, [liderId]);
    } else {
      rows = query(`${SELECT_ORDEM} ORDER BY o.created_at DESC`);
    }
    // Para cada ordem, busca os itens em uma query separada e monta o objeto completo
    return rows.map(row => {
      const itens = query('SELECT * FROM itens_ordem WHERE ordem_id = ?', [row.id]);
      return formatarOrdem(row, itens);
    });
  },

  async findById(id) {
    await ready;
    const row = get(`${SELECT_ORDEM} WHERE o.id = ?`, [id]);
    if (!row) return null;
    const itens = query('SELECT * FROM itens_ordem WHERE ordem_id = ?', [id]);
    return formatarOrdem(row, itens);
  },

  /**
   * Cria uma nova ordem de produção com seus itens.
   *
   * Fluxo:
   *   1. Para cada item, busca o produto e calcula o subtotal (preço × qtd)
   *   2. Soma o total geral
   *   3. Gera o número sequencial da ordem (para exibição amigável ex: #42)
   *   4. Insere a ordem principal
   *   5. Insere os itens vinculados à ordem
   */
  async create({ clienteId, itens, formaPagamento = 'a_prazo', observacoes = '', prazo = null, origem = 'administrativo', liderId = null }) {
    await ready;

    const Produto = require('./Produto');
    let subtotal = 0;
    const itensProcessados = [];

    // Valida e processa cada item: busca o produto, calcula valores
    for (const item of itens) {
      const produto = await Produto.findById(item.produto);
      if (!produto) throw new Error(`Produto ID ${item.produto} não encontrado`);

      const preco   = produto.precoUnitario || 0;
      const subItem = preco * item.quantidade;
      subtotal     += subItem;

      // Salva snapshot do nome e preço para histórico (o produto pode mudar no futuro)
      itensProcessados.push({
        produtoId:     produto.id,
        nomeProduto:   produto.nome,
        quantidade:    item.quantidade,
        precoUnitario: preco,
        subtotal:      subItem,
      });
    }

    const total       = subtotal;
    // Número sequencial legível — conta total de ordens + 1
    const contagem    = get('SELECT COUNT(*) as total FROM ordens');
    const numeroOrdem = (contagem?.total || 0) + 1;

    // Insere a ordem principal
    const infoOrdem = run(`
      INSERT INTO ordens
        (numero_ordem, cliente_id, subtotal, total,
         forma_pagamento, status, observacoes, prazo, origem, lider_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [numeroOrdem, clienteId, subtotal, total,
        formaPagamento, 'aguardando_producao', observacoes, prazo, origem, liderId]);

    const ordemId = infoOrdem.lastInsertRowid;

    // Insere cada item vinculado à ordem criada
    for (const it of itensProcessados) {
      run(`
        INSERT INTO itens_ordem
          (ordem_id, produto_id, nome_produto, quantidade, preco_unitario, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [ordemId, it.produtoId, it.nomeProduto, it.quantidade, it.precoUnitario, it.subtotal]);
    }

    return this.findById(ordemId);
  },

  /**
   * Atualiza apenas o status de uma ordem.
   * Usa PATCH em vez de PUT para deixar explícito que é mudança de estado.
   * Valores válidos: aguardando_producao | em_producao | finalizado | cancelado
   */
  async updateStatus(id, status) {
    await ready;
    const info = run(
      "UPDATE ordens SET status = ?, updated_at = datetime('now') WHERE id = ?",
      [status, id]
    );
    return info.changes > 0 ? this.findById(id) : null;
  },

  // Atualiza campos editáveis da ordem (observações, prazo, forma de pagamento)
  async update(id, campos) {
    await ready;
    const atual = get('SELECT * FROM ordens WHERE id = ?', [id]);
    if (!atual) return null;

    run(`
      UPDATE ordens SET
        observacoes     = ?,
        prazo           = ?,
        forma_pagamento = ?,
        updated_at      = datetime('now')
      WHERE id = ?
    `, [
      campos.observacoes     ?? atual.observacoes,
      campos.prazo           ?? atual.prazo,
      campos.formaPagamento  ?? atual.forma_pagamento,
      id
    ]);

    return this.findById(id);
  },

  /**
   * Deleta uma ordem e todos os seus itens.
   * Os itens precisam ser removidos primeiro por causa da FK (foreign key).
   */
  async delete(id) {
    await ready;
    run('DELETE FROM itens_ordem WHERE ordem_id = ?', [id]); // Remove itens antes da ordem
    const info = run('DELETE FROM ordens WHERE id = ?', [id]);
    return info.changes > 0;
  },
};

module.exports = Ordem;

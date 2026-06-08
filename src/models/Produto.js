// ============================================================
// Produto.js — Model de Produto/Peça (FactoryTrack)
// Substitui o model Pizza do sistema anterior
// ============================================================

const { ready, query, run, get } = require('../database/sqlite');

function formatarProduto(row) {
  if (!row) return null;
  return {
    _id:              row.id,
    id:               row.id,
    nome:             row.nome,
    descricao:        row.descricao,
    especificacoes:   row.especificacoes,
    precoUnitario:    row.preco_unitario,
    disponivel:       row.disponivel === 1,
    categoria:        row.categoria,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  };
}

const Produto = {

  async findAll() {
    await ready;
    return query('SELECT * FROM produtos ORDER BY categoria, nome').map(formatarProduto);
  },

  async findById(id) {
    await ready;
    return formatarProduto(get('SELECT * FROM produtos WHERE id = ?', [id]));
  },

  async create({ nome, descricao = '', especificacoes = '', precoUnitario = 0, disponivel = true, categoria = 'usinagem' }) {
    await ready;
    const info = run(
      'INSERT INTO produtos (nome, descricao, especificacoes, preco_unitario, disponivel, categoria) VALUES (?, ?, ?, ?, ?, ?)',
      [nome.trim(), descricao.trim(), especificacoes.trim(), precoUnitario, disponivel ? 1 : 0, categoria]
    );
    return this.findById(info.lastInsertRowid);
  },

  async update(id, { nome, descricao, especificacoes, precoUnitario, disponivel, categoria }) {
    await ready;
    const atual = get('SELECT * FROM produtos WHERE id = ?', [id]);
    if (!atual) return null;

    run(`
      UPDATE produtos SET
        nome            = ?,
        descricao       = ?,
        especificacoes  = ?,
        preco_unitario  = ?,
        disponivel      = ?,
        categoria       = ?,
        updated_at      = datetime('now')
      WHERE id = ?
    `, [
      nome            ?? atual.nome,
      descricao       ?? atual.descricao,
      especificacoes  ?? atual.especificacoes,
      precoUnitario   !== undefined ? precoUnitario : atual.preco_unitario,
      disponivel      !== undefined ? (disponivel ? 1 : 0) : atual.disponivel,
      categoria       ?? atual.categoria,
      id
    ]);

    return this.findById(id);
  },

  async delete(id) {
    await ready;
    const info = run('DELETE FROM produtos WHERE id = ?', [id]);
    return info.changes > 0;
  },
};

module.exports = Produto;
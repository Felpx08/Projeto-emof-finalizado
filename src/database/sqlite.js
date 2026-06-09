// ============================================================
// sqlite.js — Conexão com SQLite usando sql.js
// FactoryTrack — Sistema de Ordens de Produção
//
// sql.js roda o SQLite inteiramente em memória (WebAssembly).
// Para persistir os dados, o banco é exportado para um arquivo
// .db em disco após cada operação de escrita (run/salvar).
// ============================================================

const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');

// Caminho do arquivo do banco — pode ser sobrescrito via variável de ambiente
const DB_PATH = process.env.DB_PATH
  || path.join(__dirname, '..', '..', 'factorytrack.db');

// Estado compartilhado: mantém a instância do banco enquanto o servidor roda
const state = { db: null };

// ── Inicialização assíncrona ───────────────────────────────
// `ready` é uma Promise; o servidor só sobe após ela resolver (ver index.js).
const ready = (async () => {
  const SQL = await initSqlJs(); // Carrega o módulo WebAssembly do SQLite

  if (fs.existsSync(DB_PATH)) {
    // Banco já existe — carrega do arquivo para a memória
    const fileBuffer = fs.readFileSync(DB_PATH);
    state.db = new SQL.Database(fileBuffer);
  } else {
    // Primeira execução — cria um banco vazio em memória
    state.db = new SQL.Database();
  }

  const db = state.db;

  // Garante integridade referencial (chaves estrangeiras são desativadas por padrão no SQLite)
  db.run('PRAGMA foreign_keys = ON');

  // ── Tabela de Usuários ─────────────────────────────────
  // Perfis possíveis: Administrador | Lider | Operador
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nome        TEXT    NOT NULL,
      email       TEXT    NOT NULL UNIQUE,
      senha       TEXT    NOT NULL,         -- armazenada como hash bcrypt
      perfil      TEXT    NOT NULL DEFAULT 'Operador',
      ativo       INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── Tabela de Clientes (empresas/compradores) ──────────
  // O campo `endereco` armazena um objeto JSON serializado
  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nome        TEXT    NOT NULL,
      telefone    TEXT    NOT NULL,
      endereco    TEXT    NOT NULL DEFAULT '{}',   -- JSON: { rua, numero, bairro, cidade, cep, complemento }
      observacoes TEXT    NOT NULL DEFAULT '',
      ativo       INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── Tabela de Produtos (peças metálicas) ───────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      nome           TEXT    NOT NULL,
      descricao      TEXT    NOT NULL DEFAULT '',
      especificacoes TEXT    NOT NULL DEFAULT '',
      preco_unitario REAL    NOT NULL DEFAULT 0,
      disponivel     INTEGER NOT NULL DEFAULT 1,
      categoria      TEXT    NOT NULL DEFAULT 'usinagem',
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── Tabela de Ordens de Produção ───────────────────────
  // Status possíveis: aguardando_producao | em_producao | finalizado | cancelado
  // Origem possível: administrativo | producao
  db.run(`
    CREATE TABLE IF NOT EXISTS ordens (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_ordem      INTEGER,                                          -- número sequencial legível (ex: #42)
      cliente_id        INTEGER NOT NULL REFERENCES clientes(id),
      subtotal          REAL    NOT NULL DEFAULT 0,
      total             REAL    NOT NULL DEFAULT 0,
      forma_pagamento   TEXT    NOT NULL DEFAULT 'a_prazo',
      status            TEXT    NOT NULL DEFAULT 'aguardando_producao',
      observacoes       TEXT    NOT NULL DEFAULT '',
      prazo             TEXT,                                             -- data de entrega (ISO 8601)
      origem            TEXT    NOT NULL DEFAULT 'administrativo',
      lider_id          INTEGER REFERENCES usuarios(id),                 -- líder responsável pela produção
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── Tabela de Itens das Ordens ─────────────────────────
  // Cada linha representa um produto incluído em uma ordem,
  // com preço e subtotal fixados no momento da criação.
  db.run(`
    CREATE TABLE IF NOT EXISTS itens_ordem (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      ordem_id         INTEGER NOT NULL REFERENCES ordens(id),
      produto_id       INTEGER NOT NULL REFERENCES produtos(id),
      nome_produto     TEXT    NOT NULL,   -- snapshot do nome para histórico
      quantidade       INTEGER NOT NULL DEFAULT 1,
      preco_unitario   REAL    NOT NULL DEFAULT 0,
      subtotal         REAL    NOT NULL DEFAULT 0
    )
  `);

  // Persiste o banco em disco após criar as tabelas
  salvar();

  console.log('SQLite (sql.js) conectado:', DB_PATH);
  return db;
})();

// ── Helpers ────────────────────────────────────────────────

/**
 * Exporta o banco em memória e salva no arquivo .db.
 * Chamado automaticamente após cada run().
 */
function salvar() {
  if (!state.db) return;
  const data = state.db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

/**
 * Executa um SELECT e retorna todas as linhas como array de objetos.
 * @param {string} sql   - Query SQL com placeholders (?)
 * @param {Array}  params - Valores para os placeholders
 */
function query(sql, params = []) {
  const stmt    = state.db.prepare(sql);
  const results = [];
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free(); // Libera memória do statement compilado
  return results;
}

/**
 * Executa INSERT, UPDATE ou DELETE e persiste em disco.
 * @returns {{ lastInsertRowid, changes }} — id gerado e linhas afetadas
 */
function run(sql, params = []) {
  state.db.run(sql, params);
  // sql.js não expõe lastInsertRowid diretamente; usamos funções SQL do próprio SQLite
  const meta = query('SELECT last_insert_rowid() as id, changes() as changes');
  salvar(); // Garante que toda escrita seja persistida imediatamente
  return {
    lastInsertRowid: meta[0]?.id,
    changes:         meta[0]?.changes,
  };
}

/**
 * Atalho para buscar apenas a primeira linha (equivale a findOne).
 * Retorna null se não encontrar nada.
 */
function get(sql, params = []) {
  const rows = query(sql, params);
  return rows[0] || null;
}

module.exports = { ready, query, run, get, salvar };

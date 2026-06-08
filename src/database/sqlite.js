// ============================================================
// sqlite.js — Conexão com SQLite usando sql.js
// FactoryTrack — Sistema de Ordens de Produção
// ============================================================

const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = process.env.DB_PATH
  || path.join(__dirname, '..', '..', 'factorytrack.db');

const state = { db: null };

const ready = (async () => {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    state.db = new SQL.Database(fileBuffer);
  } else {
    state.db = new SQL.Database();
  }

  const db = state.db;

  db.run('PRAGMA foreign_keys = ON');

  // ── Tabela de Usuários ─────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nome        TEXT    NOT NULL,
      email       TEXT    NOT NULL UNIQUE,
      senha       TEXT    NOT NULL,
      perfil      TEXT    NOT NULL DEFAULT 'Operador',
      ativo       INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── Tabela de Clientes (empresas/compradores) ──────────
  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nome        TEXT    NOT NULL,
      telefone    TEXT    NOT NULL,
      endereco    TEXT    NOT NULL DEFAULT '{}',
      observacoes TEXT    NOT NULL DEFAULT '',
      ativo       INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── Tabela de Produtos (peças metálicas) ───────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      nome         TEXT    NOT NULL,
      descricao    TEXT    NOT NULL DEFAULT '',
      especificacoes TEXT  NOT NULL DEFAULT '',
      preco_unitario REAL  NOT NULL DEFAULT 0,
      disponivel   INTEGER NOT NULL DEFAULT 1,
      categoria    TEXT    NOT NULL DEFAULT 'usinagem',
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── Tabela de Ordens de Produção ───────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS ordens (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_ordem      INTEGER,
      cliente_id        INTEGER NOT NULL REFERENCES clientes(id),
      subtotal          REAL    NOT NULL DEFAULT 0,
      total             REAL    NOT NULL DEFAULT 0,
      forma_pagamento   TEXT    NOT NULL DEFAULT 'a_prazo',
      status            TEXT    NOT NULL DEFAULT 'aguardando_producao',
      observacoes       TEXT    NOT NULL DEFAULT '',
      prazo             TEXT,
      origem            TEXT    NOT NULL DEFAULT 'administrativo',
      lider_id          INTEGER REFERENCES usuarios(id),
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── Tabela de Itens das Ordens ─────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS itens_ordem (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      ordem_id         INTEGER NOT NULL REFERENCES ordens(id),
      produto_id       INTEGER NOT NULL REFERENCES produtos(id),
      nome_produto     TEXT    NOT NULL,
      quantidade       INTEGER NOT NULL DEFAULT 1,
      preco_unitario   REAL    NOT NULL DEFAULT 0,
      subtotal         REAL    NOT NULL DEFAULT 0
    )
  `);

  salvar();

  console.log('SQLite (sql.js) conectado:', DB_PATH);
  return db;
})();

// ── Helpers ────────────────────────────────────────────────

function salvar() {
  if (!state.db) return;
  const data = state.db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function query(sql, params = []) {
  const stmt    = state.db.prepare(sql);
  const results = [];
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function run(sql, params = []) {
  state.db.run(sql, params);
  const meta = query('SELECT last_insert_rowid() as id, changes() as changes');
  salvar();
  return {
    lastInsertRowid: meta[0]?.id,
    changes:         meta[0]?.changes,
  };
}

function get(sql, params = []) {
  const rows = query(sql, params);
  return rows[0] || null;
}

module.exports = { ready, query, run, get, salvar };
// ============================================================
// index.js — Ponto de entrada do servidor FactoryTrack
// Inicializa o Express, configura middlewares e sobe o servidor
// após o banco de dados estar pronto.
// ============================================================

require('dotenv').config() // Carrega variáveis de ambiente do arquivo .env

const express = require('express')
const cors    = require('cors')
const path    = require('path')

const app  = express()
const PORT = process.env.PORT || 3001

// ── Middlewares globais ────────────────────────────────────
app.use(cors())                                            // Permite requisições de origens diferentes (útil em dev)
app.use(express.json())                                    // Faz o Express entender JSON no corpo das requisições
app.use(express.static(path.join(__dirname, 'public')))   // Serve os arquivos do front-end (HTML, CSS, JS)

const { ready } = require('./src/database/sqlite')
const routes    = require('./src/routes/index')

// ── Aguarda o banco estar pronto antes de ligar as rotas ───
// O banco SQLite é assíncrono na inicialização; só registramos
// as rotas e colocamos o servidor em pé quando ele estiver ok.
ready.then(() => {
  app.use('/api', routes) // Todas as rotas da API ficam sob o prefixo /api

  // Rota de teste/health-check — confirma que a API está no ar
  app.get('/teste', (req, res) => {
    res.json({ mensagem: 'API do FactoryTrack funcionando!', status: 'online', porta: PORT })
  })

  // Rota catch-all: qualquer URL não reconhecida serve o index.html
  // Isso permite que o front-end (SPA de página única) gerencie sua própria navegação
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'))
  })

  app.listen(PORT, () => {
    console.log('=================================')
    console.log('FactoryTrack rodando na porta ' + PORT)
    console.log('API: http://localhost:' + PORT + '/api')
    console.log('Front-end: http://localhost:' + PORT)
    console.log('=================================')
  })
}).catch(err => {
  // Se o banco falhar, não faz sentido continuar — encerramos o processo
  console.error('Erro ao inicializar banco:', err)
  process.exit(1)
})

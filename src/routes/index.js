const express  = require('express');
const jwt      = require('jsonwebtoken');
const router   = express.Router();
const auth     = require('../middlewares/auth');

const Usuario  = require('../models/Usuario');
const Produto  = require('../models/Produto');
const Cliente  = require('../models/Cliente');
const Ordem    = require('../models/Ordem');

// ── Auth ───────────────────────────────────────────────────
router.post('/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha são obrigatórios' });

    const usuario = await Usuario.findByEmail(email);
    if (!usuario) return res.status(401).json({ erro: 'Credenciais inválidas' });

    const ok = await Usuario.verificarSenha(senha, usuario.senha);
    if (!ok) return res.status(401).json({ erro: 'Credenciais inválidas' });

    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil } });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// ── Produtos ───────────────────────────────────────────────
router.get('/produtos', auth, async (req, res) => {
  try { res.json(await Produto.findAll()); }
  catch (e) { res.status(500).json({ erro: e.message }); }
});

router.get('/produtos/:id', auth, async (req, res) => {
  try {
    const p = await Produto.findById(req.params.id);
    if (!p) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json(p);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.post('/produtos', auth, async (req, res) => {
  try {
    if (!req.body.nome || !req.body.especificacoes)
      return res.status(400).json({ erro: 'Nome e especificações são obrigatórios' });
    res.status(201).json(await Produto.create(req.body));
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.put('/produtos/:id', auth, async (req, res) => {
  try {
    const p = await Produto.update(req.params.id, req.body);
    if (!p) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json(p);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.delete('/produtos/:id', auth, async (req, res) => {
  try {
    const ok = await Produto.delete(req.params.id);
    if (!ok) return res.status(404).json({ erro: 'Produto não encontrado' });
    res.json({ mensagem: 'Produto deletado' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// ── Clientes ───────────────────────────────────────────────
router.get('/clientes', auth, async (req, res) => {
  try { res.json(await Cliente.findAll(req.query.busca)); }
  catch (e) { res.status(500).json({ erro: e.message }); }
});

router.get('/clientes/:id', auth, async (req, res) => {
  try {
    const c = await Cliente.findById(req.params.id);
    if (!c) return res.status(404).json({ erro: 'Cliente não encontrado' });
    res.json(c);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.post('/clientes', auth, async (req, res) => {
  try {
    if (!req.body.nome || !req.body.telefone)
      return res.status(400).json({ erro: 'Nome e telefone são obrigatórios' });
    res.status(201).json(await Cliente.create(req.body));
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.put('/clientes/:id', auth, async (req, res) => {
  try {
    const c = await Cliente.update(req.params.id, req.body);
    if (!c) return res.status(404).json({ erro: 'Cliente não encontrado' });
    res.json(c);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.delete('/clientes/:id', auth, async (req, res) => {
  try {
    const ok = await Cliente.delete(req.params.id);
    if (!ok) return res.status(404).json({ erro: 'Cliente não encontrado' });
    res.json({ mensagem: 'Cliente deletado' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// ── Ordens de Produção ─────────────────────────────────────
router.get('/ordens', auth, async (req, res) => {
  try {
    const filtros = {};
    if (req.query.lider) filtros.liderId = req.query.lider;
    res.json(await Ordem.findAll(filtros));
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.get('/ordens/:id', auth, async (req, res) => {
  try {
    const o = await Ordem.findById(req.params.id);
    if (!o) return res.status(404).json({ erro: 'Ordem não encontrada' });
    res.json(o);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.post('/ordens', auth, async (req, res) => {
  try {
    const { cliente, itens } = req.body;
    if (!cliente || !itens?.length)
      return res.status(400).json({ erro: 'cliente e itens são obrigatórios' });

    const nova = await Ordem.create({
      clienteId:      cliente,
      itens,
      formaPagamento: req.body.formaPagamento,
      observacoes:    req.body.observacoes,
      prazo:          req.body.prazo,
      origem:         req.body.origem,
      liderId:        req.body.lider || req.usuario?.id,
    });
    res.status(201).json(nova);
  } catch (e) { res.status(400).json({ erro: e.message }); }
});

router.patch('/ordens/:id/status', auth, async (req, res) => {
  try {
    const validos = ['aguardando_producao', 'em_producao', 'finalizado', 'cancelado'];
    if (!validos.includes(req.body.status))
      return res.status(400).json({ erro: 'Status inválido' });
    const o = await Ordem.updateStatus(req.params.id, req.body.status);
    if (!o) return res.status(404).json({ erro: 'Ordem não encontrada' });
    res.json(o);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.delete('/ordens/:id', auth, async (req, res) => {
  try {
    const ok = await Ordem.delete(req.params.id);
    if (!ok) return res.status(404).json({ erro: 'Ordem não encontrada' });
    res.json({ mensagem: 'Ordem deletada' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

// ── Usuários ───────────────────────────────────────────────
router.get('/usuarios', auth, async (req, res) => {
  try {
    if (req.usuario.perfil !== 'Administrador')
      return res.status(403).json({ erro: 'Acesso restrito a Administradores' });
    res.json(await Usuario.findAll());
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.post('/usuarios', auth, async (req, res) => {
  try {
    if (req.usuario.perfil !== 'Administrador')
      return res.status(403).json({ erro: 'Acesso restrito a Administradores' });
    const { nome, email, senha, perfil } = req.body;
    if (!nome || !email || !senha)
      return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
    res.status(201).json(await Usuario.create({ nome, email, senha, perfil }));
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(400).json({ erro: 'E-mail já cadastrado' });
    res.status(500).json({ erro: e.message });
  }
});

router.put('/usuarios/:id', auth, async (req, res) => {
  try {
    if (req.usuario.perfil !== 'Administrador')
      return res.status(403).json({ erro: 'Acesso restrito a Administradores' });
    const u = await Usuario.update(req.params.id, req.body);
    if (!u) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json(u);
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

router.delete('/usuarios/:id', auth, async (req, res) => {
  try {
    if (req.usuario.perfil !== 'Administrador')
      return res.status(403).json({ erro: 'Acesso restrito a Administradores' });
    const ok = await Usuario.delete(req.params.id);
    if (!ok) return res.status(404).json({ erro: 'Usuário não encontrado' });
    res.json({ mensagem: 'Usuário deletado' });
  } catch (e) { res.status(500).json({ erro: e.message }); }
});

module.exports = router;
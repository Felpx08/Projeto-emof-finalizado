// ============================================================
// auth.js — Middleware de autenticação JWT
// Verifica se a requisição possui um token válido antes de
// permitir acesso às rotas protegidas da API.
// ============================================================

const jwt = require('jsonwebtoken');

/**
 * Middleware que protege rotas privadas.
 *
 * Fluxo:
 *   1. Lê o cabeçalho Authorization (formato: "Bearer <token>")
 *   2. Rejeita com 401 se não houver token
 *   3. Valida a assinatura e expiração com JWT_SECRET
 *   4. Injeta os dados do usuário em req.usuario para uso nas rotas
 *   5. Chama next() para continuar a cadeia de middlewares
 */
function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];

  // O token vem no formato "Bearer eyJhbGci..." — pegamos só a segunda parte
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido. Faça login.' });
  }

  try {
    // jwt.verify lança exceção se o token estiver expirado ou mal-assinado
    const payload  = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario    = payload; // { id, nome, email, perfil } — disponível em todas as rotas protegidas
    next();
  } catch (erro) {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

module.exports = autenticar;

/*
 * Protecao CSRF simples baseada em sessao (sem dependencia externa).
 * Cada sessao recebe um token aleatorio; todo formulario (POST) deve enviar
 * esse token em um campo oculto "_csrf", comparado de forma protegida contra
 * timing attack antes de a requisicao ser processada.
 */
const crypto = require('crypto');

function gerarToken() {
  return crypto.randomBytes(32).toString('hex');
}

function csrfMiddleware(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = gerarToken();
  }
  res.locals.csrfToken = req.session.csrfToken;

  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const enviado = req.body && req.body._csrf;
  const esperado = req.session.csrfToken;
  const valido = typeof enviado === 'string' && esperado &&
    enviado.length === esperado.length &&
    crypto.timingSafeEqual(Buffer.from(enviado), Buffer.from(esperado));

  if (!valido) {
    return res.status(403).render('erro', {
      titulo: 'Requisição inválida',
      mensagem: 'Sua sessão expirou ou o formulário é inválido. Volte e tente novamente.'
    });
  }
  next();
}

module.exports = csrfMiddleware;

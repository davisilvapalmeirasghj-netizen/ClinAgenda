const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const PacienteService = require('../services/pacienteService');
const AuthService = require('../services/authService');
const MedicoService = require('../services/medicoService');
const { exigirVisitante } = require('../middleware/auth');

/*
 * Limite de requisicoes por IP para as rotas sensiveis (login e cadastro),
 * como camada extra de defesa alem do bloqueio por conta do AuthService
 * (protege contra forca bruta distribuida em varias contas/IPs).
 */
const limiteLogin = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas tentativas a partir deste endereço. Aguarde alguns minutos.'
});

router.get('/cadastro', exigirVisitante, (req, res) => {
  res.render('cadastro', { erros: {}, valores: {} });
});

router.post('/cadastro', exigirVisitante, limiteLogin, (req, res) => {
  const r = PacienteService.cadastrar(req.body);
  if (!r.ok) {
    return res.status(400).render('cadastro', { erros: r.erros, valores: req.body });
  }
  req.session.flash = { tipo: 'sucesso', msg: 'Cadastro realizado! Faça login para continuar.' };
  res.redirect('/login');
});

router.get('/login', exigirVisitante, (req, res) => {
  res.render('login', { erro: null, email: '' });
});

router.post('/login', exigirVisitante, limiteLogin, (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).render('login', { erro: 'Informe e-mail e senha.', email: email || '' });
  }
  const r = AuthService.verificarLogin(email, senha);
  if (!r.ok) {
    return res.status(401).render('login', { erro: r.erro, email });
  }

  const destino = req.session.destino;
  // Regenera o ID de sessao no login (evita fixacao de sessao).
  req.session.regenerate(err => {
    if (err) {
      return res.status(500).render('erro', { titulo: 'Erro', mensagem: 'Não foi possível iniciar a sessão.' });
    }
    req.session.usuarioId = r.usuario.id;
    req.session.flash = { tipo: 'sucesso', msg: `Bem-vindo(a), ${r.usuario.nome.split(' ')[0]}!` };
    const rota = destino || (r.usuario.role === 'admin' ? '/admin' : '/painel');
    res.redirect(rota);
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('clinagenda.sid');
    res.redirect('/');
  });
});

router.get('/', (req, res) => {
  res.render('index', { especialidades: MedicoService.listarEspecialidades() });
});

module.exports = router;

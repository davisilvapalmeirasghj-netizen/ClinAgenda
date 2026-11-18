const AuthService = require('../services/authService');
const LembreteService = require('../services/lembreteService');
const MedicoService = require('../services/medicoService');
const { formatarData } = require('../utils/datas');

const MAPA_ROTAS = [
  [/^\/admin\/pacientes/, 'admin-pacientes'],
  [/^\/admin\/medicos/, 'admin-medicos'],
  [/^\/admin\/consultas/, 'admin-consultas'],
  [/^\/admin\/lembretes/, 'admin-lembretes'],
  [/^\/admin/, 'admin'],
  [/^\/painel/, 'painel'],
  [/^\/medicos/, 'medicos'],
  [/^\/consultas/, 'consultas'],
  [/^\/lembretes/, 'lembretes'],
  [/^\/login/, 'login']
];

/** Carrega o usuario da sessao (se houver) em res.locals, para todas as views. */
function carregarUsuario(req, res, next) {
  const usuario = req.session.usuarioId ? AuthService.usuarioPorId(req.session.usuarioId) : null;
  // Sessao aponta para um usuario que nao existe mais: invalida por seguranca.
  if (req.session.usuarioId && !usuario) {
    req.session.usuarioId = null;
  }
  req.usuario = usuario || null;
  res.locals.usuario = usuario || null;

  res.locals.flash = req.session.flash || null;
  delete req.session.flash;

  const encontrada = MAPA_ROTAS.find(([re]) => re.test(req.path));
  res.locals.rotaAtiva = encontrada ? encontrada[1] : '';

  res.locals.avisosLembrete = (usuario && usuario.role === 'paciente')
    ? LembreteService.proximas(usuario.id).map(c => ({
        ...c, medico: MedicoService.buscar(c.medicoId), dataFormatada: formatarData(c.data)
      }))
    : [];

  next();
}

function exigirLogin(req, res, next) {
  if (!req.usuario) {
    req.session.destino = req.originalUrl;
    req.session.flash = { tipo: 'erro', msg: 'Faça login para continuar.' };
    return res.redirect('/login');
  }
  next();
}

function exigirVisitante(req, res, next) {
  if (req.usuario) {
    return res.redirect(req.usuario.role === 'admin' ? '/admin' : '/painel');
  }
  next();
}

function exigirAdmin(req, res, next) {
  if (!req.usuario || req.usuario.role !== 'admin') {
    return res.status(403).render('erro', {
      titulo: 'Acesso restrito',
      mensagem: 'Esta área é exclusiva do administrador do sistema.'
    });
  }
  next();
}

module.exports = { carregarUsuario, exigirLogin, exigirVisitante, exigirAdmin };

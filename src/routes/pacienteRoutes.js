const express = require('express');
const router = express.Router();

const { exigirLogin } = require('../middleware/auth');
const ConsultaService = require('../services/consultaService');
const MedicoService = require('../services/medicoService');
const LembreteService = require('../services/lembreteService');

router.get('/painel', exigirLogin, (req, res) => {
  if (req.usuario.role === 'admin') return res.redirect('/admin');

  const consultas = ConsultaService.doPaciente(req.usuario.id);
  const futuras = consultas.filter(c => c.status === 'agendada');
  const prox = futuras[0];
  const medicoProx = prox ? MedicoService.buscar(prox.medicoId) : null;

  res.render('painel', {
    totalFuturas: futuras.length,
    totalRealizadas: consultas.filter(c => c.status === 'realizada').length,
    totalLembretes: LembreteService.historico(req.usuario.id).length,
    prox,
    medicoProx
  });
});

module.exports = router;

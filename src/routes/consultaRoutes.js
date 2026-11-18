const express = require('express');
const router = express.Router();

const ConsultaService = require('../services/consultaService');
const MedicoService = require('../services/medicoService');
const { exigirLogin } = require('../middleware/auth');

router.get('/consultas', exigirLogin, (req, res) => {
  const lista = ConsultaService.doPaciente(req.usuario.id).map(c => ({
    ...c,
    medico: MedicoService.buscar(c.medicoId),
    podeCancelar: ConsultaService.podeCancelar(c)
  }));
  res.render('consultas', { lista, prazoCancelamento: ConsultaService.CANCELAMENTO_MIN_HORAS });
});

router.post('/consultas/:id/cancelar', exigirLogin, (req, res) => {
  const motivo = String(req.body.motivo || '').slice(0, 120);
  const r = ConsultaService.cancelar(req.usuario.id, req.params.id, motivo);
  req.session.flash = r.ok
    ? { tipo: 'sucesso', msg: 'Consulta cancelada e horário liberado.' }
    : { tipo: 'erro', msg: r.erro };
  res.redirect('/consultas');
});

module.exports = router;

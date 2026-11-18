const express = require('express');
const router = express.Router();

const MedicoService = require('../services/medicoService');
const ConsultaService = require('../services/consultaService');
const { exigirLogin } = require('../middleware/auth');

const DATA_ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

router.get('/medicos', (req, res) => {
  const especialidade = String(req.query.esp || '');
  const busca = String(req.query.busca || '').slice(0, 100);
  const lista = MedicoService.listar({ especialidade, busca }).map(m => ({
    ...m,
    proximos: MedicoService.proximosHorarios(m.id, 4)
  }));
  res.render('medicos', {
    lista, especialidade, busca,
    especialidades: MedicoService.listarEspecialidades()
  });
});

router.get('/agendar/:medicoId', exigirLogin, (req, res) => {
  const medico = MedicoService.buscar(req.params.medicoId);
  if (!medico) return res.status(404).render('erro', { titulo: 'Não encontrado', mensagem: 'Médico não encontrado.' });

  const agenda = MedicoService.agenda(medico.id);
  let dataSel = DATA_ISO_RE.test(req.query.data) ? req.query.data : null;
  if (!dataSel || !agenda.some(d => d.data === dataSel)) {
    dataSel = (agenda.find(d => d.livres.length) || agenda[0] || {}).data || null;
  }
  const diaSelecionado = agenda.find(d => d.data === dataSel);

  res.render('agendar', { medico, agenda, dataSel, diaSelecionado, erro: null });
});

router.post('/agendar/:medicoId', exigirLogin, (req, res) => {
  const medico = MedicoService.buscar(req.params.medicoId);
  if (!medico) return res.status(404).render('erro', { titulo: 'Não encontrado', mensagem: 'Médico não encontrado.' });

  const { data, hora } = req.body;
  if (!DATA_ISO_RE.test(data) || !/^\d{2}:\d{2}$/.test(hora || '')) {
    return res.status(400).render('erro', { titulo: 'Dados inválidos', mensagem: 'Selecione um dia e horário válidos.' });
  }

  const r = ConsultaService.agendar(req.usuario.id, medico.id, data, hora);
  if (!r.ok) {
    const agenda = MedicoService.agenda(medico.id);
    const diaSelecionado = agenda.find(d => d.data === data);
    return res.status(400).render('agendar', { medico, agenda, dataSel: data, diaSelecionado, erro: r.erro });
  }

  req.session.flash = { tipo: 'sucesso', msg: 'Consulta agendada com sucesso!' };
  res.redirect('/consultas');
});

module.exports = router;

const express = require('express');
const router = express.Router();

const { exigirAdmin } = require('../middleware/auth');
const PacienteService = require('../services/pacienteService');
const MedicoService = require('../services/medicoService');
const ConsultaService = require('../services/consultaService');
const LembreteService = require('../services/lembreteService');

router.use(exigirAdmin);

router.get('/admin', (req, res) => {
  const pacientes = PacienteService.listarPacientes();
  const consultas = ConsultaService.todas();
  res.render('admin/dashboard', {
    totalPacientes: pacientes.length,
    totalMedicos: MedicoService.listar().length,
    totalConsultasAgendadas: consultas.filter(c => c.status === 'agendada').length,
    totalConsultasCanceladas: consultas.filter(c => c.status === 'cancelada').length,
    totalLembretes: LembreteService.historicoTodos().length,
    proximasConsultas: consultas.filter(c => c.status === 'agendada').slice(-5).reverse()
      .map(c => ({ ...c, medico: MedicoService.buscar(c.medicoId), paciente: PacienteService.buscar(c.pacienteId) }))
  });
});

router.get('/admin/pacientes', (req, res) => {
  const lista = PacienteService.listarPacientes().map(p => ({
    ...p,
    totalConsultas: ConsultaService.doPaciente(p.id).length
  }));
  res.render('admin/pacientes', { lista });
});

router.get('/admin/medicos', (req, res) => {
  res.render('admin/medicos', {
    lista: MedicoService.listar(),
    especialidades: MedicoService.listarEspecialidades(),
    erros: {},
    valores: {}
  });
});

router.post('/admin/medicos', (req, res) => {
  const dados = req.body;
  const erros = {};
  if (!dados.nome || !dados.nome.trim()) erros.nome = 'Informe o nome do médico.';
  if (!dados.crm || !dados.crm.trim()) erros.crm = 'Informe o CRM.';
  if (!dados.especialidade || !dados.especialidade.trim()) erros.especialidade = 'Informe a especialidade.';
  const dias = (Array.isArray(dados.dias) ? dados.dias : [dados.dias]).filter(Boolean);
  if (!dias.length) erros.dias = 'Selecione ao menos um dia da semana.';
  if (!/^\d{2}:\d{2}$/.test(dados.turnoInicio || '') || !/^\d{2}:\d{2}$/.test(dados.turnoFim || '')) {
    erros.turno = 'Informe horário de início e fim válidos.';
  } else if (dados.turnoInicio >= dados.turnoFim) {
    erros.turno = 'O horário de início deve ser antes do horário de fim.';
  }
  const duracao = Number(dados.duracao);
  if (!duracao || duracao < 10 || duracao > 180) erros.duracao = 'Duração da consulta deve ser entre 10 e 180 minutos.';

  if (Object.keys(erros).length) {
    return res.status(400).render('admin/medicos', {
      lista: MedicoService.listar(), especialidades: MedicoService.listarEspecialidades(), erros, valores: dados
    });
  }

  MedicoService.criar(dados);
  req.session.flash = { tipo: 'sucesso', msg: 'Médico cadastrado com sucesso.' };
  res.redirect('/admin/medicos');
});

router.get('/admin/consultas', (req, res) => {
  const status = String(req.query.status || '');
  let lista = ConsultaService.todas();
  if (status) lista = lista.filter(c => c.status === status);
  lista = lista.map(c => ({
    ...c,
    medico: MedicoService.buscar(c.medicoId),
    paciente: PacienteService.buscar(c.pacienteId)
  }));
  res.render('admin/consultas', { lista, status });
});

router.get('/admin/lembretes', (req, res) => {
  const lista = LembreteService.historicoTodos().map(l => ({
    ...l,
    paciente: PacienteService.buscar(l.pacienteId)
  }));
  res.render('admin/lembretes', { lista });
});

module.exports = router;

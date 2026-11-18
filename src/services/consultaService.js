/* HU04 - Agendamento e HU05 - Cancelamento de consulta (Sprint 2) */
const Storage = require('../db');
const { paraDate } = require('../utils/datas');
const { gerarId } = require('../utils/validacao');
const MedicoService = require('./medicoService');

const CANCELAMENTO_MIN_HORAS = 2; // regra de negocio: cancelar ate 2h antes

const momento = c => paraDate(c.data, c.hora).getTime();

const agendar = (pacienteId, medicoId, data, hora) => {
  const medico = MedicoService.buscar(medicoId);
  if (!medico) return { ok: false, erro: 'Médico não encontrado.' };
  if (!MedicoService.horariosLivres(medicoId, data).includes(hora)) {
    return { ok: false, erro: 'Este horário não está mais disponível. Escolha outro.' };
  }

  const ativas = Storage.listar('consultas').filter(c => c.pacienteId === pacienteId && c.status === 'agendada');
  if (ativas.some(c => c.data === data && c.hora === hora)) {
    return { ok: false, erro: 'Você já tem uma consulta neste mesmo horário.' };
  }
  if (ativas.some(c => c.medicoId === medicoId && c.data === data)) {
    return { ok: false, erro: 'Você já tem consulta com este médico neste dia.' };
  }

  const consulta = {
    id: gerarId('con'), pacienteId, medicoId, data, hora,
    especialidade: medico.especialidade, status: 'agendada',
    criadoEm: new Date().toISOString(), lembreteEnviado: false
  };
  Storage.inserir('consultas', consulta);
  return { ok: true, consulta };
};

const podeCancelar = c =>
  c.status === 'agendada' && momento(c) - Date.now() >= CANCELAMENTO_MIN_HORAS * 3600000;

const cancelar = (pacienteId, consultaId, motivo = '') => {
  const c = Storage.buscar('consultas', consultaId);
  if (!c || c.pacienteId !== pacienteId) return { ok: false, erro: 'Consulta não encontrada.' };
  if (c.status !== 'agendada') return { ok: false, erro: 'Esta consulta não pode mais ser cancelada.' };
  if (!podeCancelar(c)) {
    return { ok: false, erro: `O cancelamento deve ser feito com pelo menos ${CANCELAMENTO_MIN_HORAS}h de antecedência. Entre em contato com a clínica.` };
  }
  // O horario volta a ficar livre automaticamente, pois so consultas "agendada" ocupam a grade.
  Storage.atualizar('consultas', consultaId, { status: 'cancelada', motivo, canceladoEm: new Date().toISOString() });
  return { ok: true };
};

/** Lista consultas do paciente, marcando como "realizada" as que ja passaram. */
const doPaciente = pacienteId => Storage.listar('consultas')
  .filter(c => c.pacienteId === pacienteId)
  .map(c => (c.status === 'agendada' && momento(c) < Date.now()) ? { ...c, status: 'realizada' } : c)
  .sort((a, b) => momento(a) - momento(b));

const todas = () => Storage.listar('consultas')
  .map(c => (c.status === 'agendada' && momento(c) < Date.now()) ? { ...c, status: 'realizada' } : c)
  .sort((a, b) => momento(b) - momento(a));

module.exports = { agendar, cancelar, podeCancelar, doPaciente, todas, momento, CANCELAMENTO_MIN_HORAS };

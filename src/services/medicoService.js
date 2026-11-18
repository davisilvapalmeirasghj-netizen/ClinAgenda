/* HU03 - Consulta de medicos disponiveis (Sprint 1) */
const Storage = require('../db');
const { pad, paraDate, dataISO } = require('../utils/datas');
const { gerarId } = require('../utils/validacao');

const DIAS_A_FRENTE = 14;
const ANTECEDENCIA_MIN = 60; // so oferece horarios com pelo menos 1h de antecedencia

const listarEspecialidades = () => Storage.listar('especialidades');

const listar = ({ especialidade = '', busca = '' } = {}) => {
  const termo = busca.trim().toLowerCase();
  return Storage.listar('medicos').filter(m =>
    (!especialidade || m.especialidade === especialidade) &&
    (!termo || m.nome.toLowerCase().includes(termo)));
};

/** Gera todos os horarios de atendimento de um medico em uma data. */
const gradeDoDia = (medico, data) => {
  const dia = paraDate(data).getDay();
  if (!medico.dias.includes(dia)) return [];
  const horarios = [];
  for (const [ini, fim] of medico.turnos) {
    let t = paraDate(data, ini);
    const limite = paraDate(data, fim);
    while (t.getTime() + medico.duracao * 60000 <= limite.getTime()) {
      horarios.push(`${pad(t.getHours())}:${pad(t.getMinutes())}`);
      t = new Date(t.getTime() + medico.duracao * 60000);
    }
  }
  return horarios;
};

/** Horarios livres = grade do dia menos consultas ativas menos horarios passados/muito proximos. */
const horariosLivres = (medicoId, data) => {
  const medico = Storage.buscar('medicos', medicoId);
  if (!medico) return [];
  const ocupados = new Set(Storage.listar('consultas')
    .filter(c => c.medicoId === medicoId && c.data === data && c.status === 'agendada')
    .map(c => c.hora));
  const minimo = Date.now() + ANTECEDENCIA_MIN * 60000;
  return gradeDoDia(medico, data)
    .filter(h => !ocupados.has(h) && paraDate(data, h).getTime() >= minimo);
};

/** Proximos dias (a partir de hoje) com a quantidade de horarios livres. */
const agenda = medicoId => {
  const dias = [];
  const hoje = new Date();
  for (let i = 0; i < DIAS_A_FRENTE; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i);
    const data = dataISO(d);
    dias.push({ data, livres: horariosLivres(medicoId, data) });
  }
  return dias;
};

const proximosHorarios = (medicoId, qtd = 4) => {
  const out = [];
  for (const dia of agenda(medicoId)) {
    for (const hora of dia.livres) {
      out.push({ data: dia.data, hora });
      if (out.length >= qtd) return out;
    }
  }
  return out;
};

const buscar = id => Storage.buscar('medicos', id);

/** Usado pelo painel administrativo (HU extra: cadastro de medicos/grades). */
const criar = dados => {
  const dias = (Array.isArray(dados.dias) ? dados.dias : [dados.dias]).filter(Boolean).map(Number);
  const medico = {
    id: gerarId('m'),
    nome: dados.nome.trim(),
    crm: dados.crm.trim(),
    especialidade: dados.especialidade.trim(),
    dias,
    turnos: [[dados.turnoInicio, dados.turnoFim]],
    duracao: Number(dados.duracao) || 30
  };
  Storage.inserir('medicos', medico);
  const especialidades = Storage.listar('especialidades');
  if (!especialidades.includes(medico.especialidade)) {
    Storage.salvarTudo('especialidades', [...especialidades, medico.especialidade]);
  }
  return medico;
};

module.exports = {
  listar, listarEspecialidades, horariosLivres, agenda, proximosHorarios, buscar, criar,
  DIAS_A_FRENTE
};

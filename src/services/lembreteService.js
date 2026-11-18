/*
 * HU06 - Envio de lembrete da consulta (Sprint 3)
 * Simula o envio por e-mail/SMS: registra o envio e disponibiliza o aviso na tela.
 * Diferente do protótipo original (que só verificava enquanto o navegador estava
 * aberto), aqui a varredura roda no servidor (setInterval em server.js) e cobre
 * TODOS os pacientes, mesmo com ninguém logado no momento.
 */
const Storage = require('../db');
const { formatarData } = require('../utils/datas');
const { gerarId, mascaraTelefone } = require('../utils/validacao');
const ConsultaService = require('./consultaService');
const MedicoService = require('./medicoService');
const PacienteService = require('./pacienteService');

const JANELA_HORAS = 24; // lembrete enviado nas 24h anteriores a consulta

const pendentesDoPaciente = pacienteId => {
  const agora = Date.now();
  return Storage.listar('consultas').filter(c =>
    c.pacienteId === pacienteId && c.status === 'agendada' && !c.lembreteEnviado &&
    ConsultaService.momento(c) > agora &&
    ConsultaService.momento(c) - agora <= JANELA_HORAS * 3600000);
};

/** Envia (simula) os lembretes devidos de UM paciente e devolve os que foram enviados agora. */
const processarPaciente = pacienteId => {
  const paciente = PacienteService.buscar(pacienteId);
  if (!paciente) return [];
  const enviados = [];
  for (const c of pendentesDoPaciente(pacienteId)) {
    const medico = MedicoService.buscar(c.medicoId);
    const destino = paciente.lembretePor === 'sms' ? mascaraTelefone(paciente.telefone) : paciente.email;
    const registro = {
      id: gerarId('lem'), consultaId: c.id, pacienteId,
      canal: paciente.lembretePor === 'sms' ? 'SMS' : 'E-mail', destino,
      mensagem: `Olá, ${paciente.nome.split(' ')[0]}! Lembrete: sua consulta com ${medico.nome} (${c.especialidade}) é em ${formatarData(c.data)} às ${c.hora}.`,
      enviadoEm: new Date().toISOString()
    };
    Storage.inserir('lembretes', registro);
    Storage.atualizar('consultas', c.id, { lembreteEnviado: true });
    enviados.push(registro);
  }
  return enviados;
};

/** Varre TODOS os pacientes com consultas pendentes de lembrete (chamado pelo agendador do servidor). */
const processarTodos = () => {
  const idsComPendencia = new Set(
    Storage.listar('consultas')
      .filter(c => c.status === 'agendada' && !c.lembreteEnviado)
      .map(c => c.pacienteId)
  );
  let total = 0;
  for (const pacienteId of idsComPendencia) total += processarPaciente(pacienteId).length;
  return total;
};

/** Proximas consultas dentro da janela (para o aviso fixo no topo). */
const proximas = pacienteId => {
  const agora = Date.now();
  return Storage.listar('consultas').filter(c =>
    c.pacienteId === pacienteId && c.status === 'agendada' &&
    ConsultaService.momento(c) > agora && ConsultaService.momento(c) - agora <= JANELA_HORAS * 3600000);
};

const historico = pacienteId => Storage.listar('lembretes')
  .filter(l => l.pacienteId === pacienteId)
  .sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm));

const historicoTodos = () => Storage.listar('lembretes')
  .sort((a, b) => b.enviadoEm.localeCompare(a.enviadoEm));

module.exports = { processarPaciente, processarTodos, proximas, historico, historicoTodos, JANELA_HORAS };

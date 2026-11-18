/* HU02 - Login no sistema (Sprint 1) */
const bcrypt = require('bcryptjs');
const Storage = require('../db');
const PacienteService = require('./pacienteService');

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MIN = 5;

/** Verifica as credenciais. Nao mexe em sessao (isso fica a cargo da rota/controller). */
const verificarLogin = (email, senha) => {
  const controle = Storage.lerValor('tentativas') || {};
  const chave = String(email || '').trim().toLowerCase();
  const reg = controle[chave];

  if (reg && reg.bloqueadoAte && Date.now() < reg.bloqueadoAte) {
    const min = Math.ceil((reg.bloqueadoAte - Date.now()) / 60000);
    return { ok: false, erro: `Muitas tentativas. Tente novamente em ${min} min.` };
  }

  const usuario = PacienteService.buscarPorEmail(chave);
  const valido = usuario && bcrypt.compareSync(senha || '', usuario.senhaHash);

  if (!valido) {
    const n = (reg?.n || 0) + 1;
    controle[chave] = n >= MAX_TENTATIVAS
      ? { n: 0, bloqueadoAte: Date.now() + BLOQUEIO_MIN * 60000 }
      : { n };
    Storage.gravarValor('tentativas', controle);
    // Mensagem generica: nao revela se o e-mail existe ou nao
    return { ok: false, erro: 'E-mail ou senha incorretos.' };
  }

  delete controle[chave];
  Storage.gravarValor('tentativas', controle);
  return { ok: true, usuario };
};

const usuarioPorId = id => PacienteService.buscar(id);

module.exports = { verificarLogin, usuarioPorId };

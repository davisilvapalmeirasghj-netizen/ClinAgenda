/* HU01 - Cadastro de pacientes (Sprint 1) */
const bcrypt = require('bcryptjs');
const Storage = require('../db');
const { cpfValido, emailValido, somenteDigitos, gerarId } = require('../utils/validacao');
const { paraDate } = require('../utils/datas');

const SAL_ROUNDS = 10;

/** Valida os dados do formulario e devolve um objeto { campo: mensagem } com os erros encontrados. */
const validar = dados => {
  const erros = {};
  const usuarios = Storage.listar('usuarios');
  const cpf = somenteDigitos(dados.cpf);
  const email = String(dados.email || '').trim().toLowerCase();

  if (!dados.nome || dados.nome.trim().split(/\s+/).length < 2) erros.nome = 'Informe o nome completo.';

  if (!cpfValido(cpf)) erros.cpf = 'CPF inválido.';
  else if (usuarios.some(p => p.cpf === cpf)) erros.cpf = 'Já existe um cadastro com este CPF.';

  if (!dados.nascimento) erros.nascimento = 'Informe a data de nascimento.';
  else {
    const nasc = paraDate(dados.nascimento);
    if (isNaN(nasc.getTime()) || nasc > new Date() || nasc.getFullYear() < 1900) {
      erros.nascimento = 'Data de nascimento inválida.';
    }
  }

  const tel = somenteDigitos(dados.telefone);
  if (tel.length < 10 || tel.length > 11) erros.telefone = 'Telefone inválido. Use DDD + número.';

  if (!emailValido(email)) erros.email = 'E-mail inválido.';
  else if (usuarios.some(p => p.email === email)) erros.email = 'Este e-mail já está cadastrado.';

  if (!dados.senha || dados.senha.length < 6) erros.senha = 'A senha deve ter pelo menos 6 caracteres.';
  if (dados.senha !== dados.confirmacao) erros.confirmacao = 'As senhas não conferem.';

  return erros;
};

const cadastrar = dados => {
  const erros = validar(dados);
  if (Object.keys(erros).length) return { ok: false, erros };

  const paciente = {
    id: gerarId('pac'),
    nome: dados.nome.trim(),
    cpf: somenteDigitos(dados.cpf),
    nascimento: dados.nascimento,
    telefone: somenteDigitos(dados.telefone),
    email: dados.email.trim().toLowerCase(),
    lembretePor: dados.lembretePor === 'sms' ? 'sms' : 'email',
    role: 'paciente',
    senhaHash: bcrypt.hashSync(dados.senha, SAL_ROUNDS),
    criadoEm: new Date().toISOString()
  };
  Storage.inserir('usuarios', paciente);
  return { ok: true, paciente };
};

const buscarPorEmail = email =>
  Storage.listar('usuarios').find(p => p.email === String(email).trim().toLowerCase()) || null;

const buscar = id => Storage.buscar('usuarios', id);

const listarPacientes = () => Storage.listar('usuarios').filter(u => u.role === 'paciente');

module.exports = { validar, cadastrar, buscarPorEmail, buscar, listarPacientes };

/*
 * Dados iniciais: especialidades, corpo clinico (ficticios) e o usuario
 * administrador (master) da clinica. Roda uma unica vez (idempotente).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Storage = require('./db');
const { gerarId } = require('./utils/validacao');

const VERSAO_SEED = 1;
const CREDENCIAIS_PATH = path.join(__dirname, '..', 'CREDENCIAIS.md');

const especialidades = ['Clínica Geral', 'Cardiologia', 'Dermatologia', 'Pediatria', 'Ortopedia', 'Ginecologia'];

// dias: 0=Dom ... 6=Sab | turnos com inicio/fim | duracao em minutos
const medicos = [
  { id: 'm1', nome: 'Dra. Helena Martins', crm: 'CRM-PR 21458', especialidade: 'Clínica Geral', dias: [1, 2, 3, 4, 5], turnos: [['08:00', '12:00']], duracao: 30 },
  { id: 'm2', nome: 'Dr. Rafael Nogueira', crm: 'CRM-PR 18733', especialidade: 'Cardiologia', dias: [1, 3, 5], turnos: [['13:30', '17:30']], duracao: 40 },
  { id: 'm3', nome: 'Dra. Camila Duarte', crm: 'CRM-PR 30112', especialidade: 'Dermatologia', dias: [2, 4], turnos: [['08:00', '12:00'], ['14:00', '18:00']], duracao: 30 },
  { id: 'm4', nome: 'Dr. Thiago Albuquerque', crm: 'CRM-PR 25690', especialidade: 'Pediatria', dias: [1, 2, 3, 4, 5], turnos: [['14:00', '18:00']], duracao: 30 },
  { id: 'm5', nome: 'Dra. Beatriz Lacerda', crm: 'CRM-PR 27841', especialidade: 'Ortopedia', dias: [2, 4, 6], turnos: [['08:00', '12:00']], duracao: 40 },
  { id: 'm6', nome: 'Dra. Juliana Prado', crm: 'CRM-PR 19955', especialidade: 'Ginecologia', dias: [1, 3, 5], turnos: [['08:00', '12:00']], duracao: 30 },
  { id: 'm7', nome: 'Dr. Marcos Vieira', crm: 'CRM-PR 22307', especialidade: 'Clínica Geral', dias: [1, 2, 3, 4, 5], turnos: [['13:00', '17:00']], duracao: 30 }
];

/** Gera uma senha aleatoria forte (sem caracteres ambiguos), apenas no primeiro boot. */
function gerarSenhaForte(tamanho = 16) {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%&*';
  let senha = '';
  for (let i = 0; i < tamanho; i++) {
    senha += alfabeto[crypto.randomInt(alfabeto.length)];
  }
  return senha;
}

function seedDadosClinicos() {
  if (Storage.lerValor('versaoSeed') === VERSAO_SEED) return;
  Storage.salvarTudo('especialidades', especialidades);
  Storage.salvarTudo('medicos', medicos);
  Storage.gravarValor('versaoSeed', VERSAO_SEED);
}

/** Cria o usuario administrador (master) da clinica, uma unica vez. */
function seedAdmin({ nome, email }) {
  const usuarios = Storage.listar('usuarios');
  const jaExiste = usuarios.some(u => u.role === 'admin');
  if (jaExiste) return null;

  const senha = gerarSenhaForte();
  const admin = {
    id: gerarId('adm'),
    nome,
    email: email.trim().toLowerCase(),
    role: 'admin',
    telefone: null,
    cpf: null,
    nascimento: null,
    lembretePor: 'email',
    senhaHash: bcrypt.hashSync(senha, 12),
    criadoEm: new Date().toISOString()
  };
  Storage.inserir('usuarios', admin);

  const conteudo = `# Credenciais do usuário administrador (master) - ClinAgenda

Gerado automaticamente em ${new Date().toLocaleString('pt-BR')}.
Guarde este arquivo em local seguro e NÃO o compartilhe nem o envie para repositórios públicos.
Este arquivo já está no .gitignore do projeto.

- Nome: ${nome}
- E-mail de login: ${admin.email}
- Senha: ${senha}
- Papel: administrador (acesso ao painel /admin)

Recomenda-se trocar a senha após o primeiro acesso (ver seção "Segurança" do README.md).
`;
  fs.writeFileSync(CREDENCIAIS_PATH, conteudo, 'utf8');
  return { admin, senha };
}

module.exports = { seedDadosClinicos, seedAdmin };

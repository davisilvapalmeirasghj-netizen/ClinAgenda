const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');

const Seed = require('./seed');
const csrf = require('./middleware/csrf');
const { carregarUsuario } = require('./middleware/auth');
const LembreteService = require('./services/lembreteService');

const PORTA = process.env.PORT || 3000;
const PRODUCAO = process.env.NODE_ENV === 'production';

// --- Segredo de sessao: vem de variavel de ambiente ou e gerado e persistido
// localmente (nunca fica hardcoded no codigo-fonte / controle de versao). ---
function obterSegredoSessao() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const arquivo = path.join(__dirname, '..', 'data', '.session-secret');
  if (fs.existsSync(arquivo)) return fs.readFileSync(arquivo, 'utf8').trim();
  const dir = path.dirname(arquivo);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const novo = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(arquivo, novo, 'utf8');
  return novo;
}

// --- Dados iniciais (especialidades, medicos ficticios e o usuario admin) ---
// A identidade do administrador NUNCA fica hardcoded no codigo-fonte (que e publico).
// Por padrao usa um nome/e-mail genericos; para personalizar no seu proprio
// ambiente, crie data/admin-local.json (fora do controle de versao) com
// { "nome": "Seu Nome", "email": "seu@email.com" } antes do primeiro "npm start".
function obterIdentidadeAdmin() {
  const arquivoLocal = path.join(__dirname, '..', 'data', 'admin-local.json');
  if (fs.existsSync(arquivoLocal)) {
    try {
      const dados = JSON.parse(fs.readFileSync(arquivoLocal, 'utf8'));
      if (dados.nome && dados.email) return dados;
    } catch { /* arquivo invalido: usa o padrao abaixo */ }
  }
  return {
    nome: process.env.ADMIN_NOME || 'Administrador da Clínica',
    email: process.env.ADMIN_EMAIL || 'admin@clinagenda.local'
  };
}

Seed.seedDadosClinicos();
const resultadoAdmin = Seed.seedAdmin(obterIdentidadeAdmin());
if (resultadoAdmin) {
  console.log('\n==============================================================');
  console.log(' Usuário administrador (master) criado com sucesso!');
  console.log(' E-mail: ' + resultadoAdmin.admin.email);
  console.log(' Senha : ' + resultadoAdmin.senha);
  console.log(' (também salvo em CREDENCIAIS.md, na raiz do projeto)');
  console.log('==============================================================\n');
}

const app = express();
app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.disable('x-powered-by');

// Helpers de formatacao disponiveis em todas as views (EJS), evitando duplicar
// essa logica em cada rota.
const { formatarData, formatarDataCurta } = require('./utils/datas');
const { mascaraCPF, mascaraTelefone } = require('./utils/validacao');
Object.assign(app.locals, { formatarData, formatarDataCurta, mascaraCPF, mascaraTelefone });

// --- Cabecalhos HTTP de seguranca ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  }
}));

app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));

app.use(session({
  name: 'clinagenda.sid',
  secret: obterSegredoSessao(),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: PRODUCAO, // exige HTTPS em producao; em dev local (http) fica desativado
    maxAge: 2 * 60 * 60 * 1000 // 2 horas
  }
}));

app.use(carregarUsuario);
app.use(csrf);

// --- Rotas ---
app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/pacienteRoutes'));
app.use('/', require('./routes/medicoRoutes'));
app.use('/', require('./routes/consultaRoutes'));
app.use('/', require('./routes/lembreteRoutes'));
app.use('/', require('./routes/adminRoutes'));

app.use((req, res) => {
  res.status(404).render('404');
});

// Handler de erro: nunca expõe stack trace/detalhes internos ao cliente.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('erro', {
    titulo: 'Erro inesperado',
    mensagem: 'Algo deu errado ao processar sua solicitação. Tente novamente.'
  });
});

app.listen(PORTA, () => {
  console.log(`ClinAgenda rodando em http://localhost:${PORTA}`);
});

// Agendador de lembretes (HU06): roda no servidor, a cada minuto,
// independente de haver alguem logado no navegador.
setInterval(() => {
  const total = LembreteService.processarTodos();
  if (total) console.log(`[lembretes] ${total} lembrete(s) simulados(s) enviados.`);
}, 60 * 1000);

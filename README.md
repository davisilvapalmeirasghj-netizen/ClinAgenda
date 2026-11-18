# ClinAgenda — sistema web de agendamento de consultas

Sistema desenvolvido para a **TechCare Sistemas**, para uma clínica médica, conforme o
Product Backlog definido no estudo de caso de *Processos de Software* (Scrum). Esta versão é uma
aplicação web real, com backend em Node.js, sessões de usuário e um usuário administrador
(master) para a gestão da clínica — diferente do protótipo somente front-end (HTML/JS/localStorage)
usado na fase de levantamento inicial.

## Por que esta stack

| Camada | Escolha | Motivo |
|---|---|---|
| Linguagem/Runtime | **Node.js** | Mesma linguagem no front e no back, ecossistema maduro, fácil de rodar em qualquer SO sem instalar banco de dados externo. |
| Framework web | **Express** | Minimalista, padrão de mercado, ótimo para um domínio pequeno de rotas (as 6 HUs do backlog). |
| Views | **EJS** (renderizado no servidor) | Evita a complexidade de um front-end SPA (build, bundler) para um sistema de telas e formulários; reduz a superfície de ataque (sem API pública exposta). |
| Persistência | Arquivo JSON no servidor (`data/db.json`), acesso centralizado em `src/db.js` | Zero dependências nativas para instalar (sem compilação em C++), 100% portátil; a camada de acesso já é isolada, então trocar por PostgreSQL/MySQL no futuro não afeta os `services`. |
| Autenticação | **express-session** + **bcryptjs** | Sessão no servidor (cookie apenas com um ID opaco) é mais segura que token manual; bcrypt é o padrão para hash de senha. |
| Segurança HTTP | **helmet** + CSRF próprio + **express-rate-limit** | Ver seção "Segurança" abaixo. |

## Como executar

Pré-requisito: [Node.js](https://nodejs.org) 18 ou superior instalado.

```bash
cd "ClinAgenda"
npm install
npm start
```

Acesse **http://localhost:3000** no navegador.

Na primeira execução, o sistema cria automaticamente:
- as especialidades e os médicos fictícios da clínica;
- o **usuário administrador (master)**, com uma senha aleatória forte, exibida uma única vez no
  terminal e salva em `CREDENCIAIS.md` (arquivo local, fora do controle de versão).

Por padrão, o administrador é criado com nome/e-mail genéricos (`Administrador da Clínica` /
`admin@clinagenda.local`) — nenhum dado pessoal fica no código-fonte público. Para usar seu
próprio nome/e-mail no seu ambiente local, crie o arquivo `data/admin-local.json` (também fora do
controle de versão) antes do primeiro `npm start`:
```json
{ "nome": "Seu Nome", "email": "seu@email.com" }
```

## Funcionalidades × Product Backlog

| Prioridade | História de usuário | Sprint | Onde está no código |
|---|---|---|---|
| 1 | **HU01** Cadastro de pacientes | Sprint 1 | `src/services/pacienteService.js` · rota `/cadastro` |
| 2 | **HU02** Login no sistema | Sprint 1 | `src/services/authService.js` · rota `/login` |
| 3 | **HU03** Consulta de médicos disponíveis | Sprint 1 | `src/services/medicoService.js` · rota `/medicos` |
| 4 | **HU04** Agendamento de consulta | Sprint 2 | `src/services/consultaService.js` · rota `/agendar/:id` |
| 5 | **HU05** Cancelamento de consulta | Sprint 2 | `src/services/consultaService.js` · rota `/consultas` |
| 6 | **HU06** Envio de lembrete da consulta | Sprint 3 | `src/services/lembreteService.js` · rota `/lembretes` |

**Extra (fora do backlog original, adicionado para o usuário administrador):** cadastro de médicos e
grades de atendimento pelo painel `/admin/medicos` — a limitação "não há área administrativa para a
clínica cadastrar médicos" do protótipo inicial foi resolvida nesta versão.

## Regras de negócio implementadas

- **Cadastro:** nome completo, CPF válido (dígitos verificadores), telefone com DDD e e-mail válido.
  CPF e e-mail não podem se repetir. Senha com no mínimo 6 caracteres, armazenada com hash bcrypt.
- **Login:** mensagem de erro genérica (não revela se o e-mail existe). Após 5 tentativas erradas,
  a conta fica bloqueada por 5 minutos. Há também um limite de requisições por IP nas rotas de
  login/cadastro.
- **Médicos:** filtro por especialidade e por nome. Mostra os próximos horários livres, calculados a
  partir da grade de cada médico (dias da semana, turnos e duração da consulta) para os próximos 14 dias.
- **Agendamento:** só aceita horários livres com pelo menos 1h de antecedência. O paciente não pode
  ter duas consultas no mesmo horário nem duas com o mesmo médico no mesmo dia.
- **Cancelamento:** permitido até 2h antes da consulta. O horário volta a ficar livre imediatamente.
- **Lembrete:** enviado nas 24h anteriores à consulta, pelo canal escolhido no cadastro (e-mail ou
  SMS, **simulado** — fica registrado no histórico). Roda em um agendador no **servidor** a cada
  minuto, cobrindo todos os pacientes (mesmo sem ninguém com o navegador aberto).
- **Administrador (master):** acesso exclusivo ao painel `/admin`, com visão de pacientes, médicos,
  todas as consultas e todos os lembretes enviados pela clínica.

## Segurança no desenvolvimento

Práticas aplicadas nesta aplicação:

1. **Senhas com hash + salt (bcrypt, 10–12 rounds)** — nunca armazenadas em texto puro.
2. **Prevenção de enumeração de usuários** — erro de login genérico ("e-mail ou senha incorretos").
3. **Bloqueio por tentativas (lockout)** — 5 tentativas erradas bloqueiam a conta por 5 minutos
   (`src/services/authService.js`), além de um `express-rate-limit` por IP nas rotas `/login` e
   `/cadastro` como segunda camada contra força bruta.
4. **Proteção CSRF** própria baseada em token de sessão (`src/middleware/csrf.js`): todo formulário
   POST envia um token oculto comparado com `crypto.timingSafeEqual` (resistente a timing attack).
5. **Cookies de sessão seguros**: `httpOnly` (inacessível via JavaScript/XSS), `sameSite: lax`
   (mitiga CSRF cross-site), `secure` ativado automaticamente em produção (exige HTTPS), expiração
   de 2 horas, e **regeneração do ID de sessão no login** (evita fixação de sessão).
6. **Segredo de sessão nunca hardcoded**: lido de `SESSION_SECRET` (variável de ambiente) ou gerado
   aleatoriamente e persistido em `data/.session-secret` (fora do git).
7. **Cabeçalhos HTTP de segurança** via `helmet`: Content-Security-Policy restritiva (só permite
   scripts/estilos do próprio domínio — sem inline, o que também bloqueia a maioria dos ataques XSS
   de injeção de script), `X-Powered-By` desabilitado, proteção contra clickjacking, etc.
8. **Escape automático de saída (anti-XSS)** — todas as views EJS usam `<%= %>` (que escapa HTML);
   nenhum dado do usuário é inserido como HTML não escapado.
9. **Validação e sanitização de entrada** no servidor para todos os formulários (CPF, e-mail,
   telefone, datas, tamanhos máximos de campos) — a validação do cliente é só conveniência, a
   fonte da verdade é sempre o backend.
10. **Autorização por papel (role)** em middleware dedicado (`exigirLogin`, `exigirAdmin`) — todas as
    rotas administrativas (`/admin/**`) exigem explicitamente `role === 'admin'`.
11. **Limite de tamanho de payload** (`express.json`/`urlencoded` com `limit: '100kb'`) para reduzir
    risco de negação de serviço por requisições grandes.
12. **Tratamento de erros sem vazamento de detalhes internos** — um error handler central nunca
    expõe stack traces ou mensagens internas ao cliente; tudo é logado apenas no servidor.
13. **Dados sensíveis fora do controle de versão** (`.gitignore`): banco de dados local, segredo de
    sessão e `CREDENCIAIS.md` nunca são versionados.

### Recomendações para um ambiente de produção real
- Rodar atrás de HTTPS (ex.: proxy reverso com certificado TLS) — os cookies já ficam `secure`
  automaticamente quando `NODE_ENV=production`.
- Trocar a persistência em arquivo por um banco relacional (PostgreSQL/MySQL) com conexões
  parametrizadas (a camada `src/db.js` foi isolada exatamente para essa troca).
- Integrar um provedor real de e-mail/SMS para o envio de lembretes (hoje simulado).
- Adicionar autenticação multifator (MFA) para o usuário administrador.

## Arquitetura (em camadas)

```
ClinAgenda/
├── src/
│   ├── server.js          # Express, sessão, segurança (helmet/CSRF/rate limit), rotas, agendador
│   ├── db.js               # Repositório (acesso a data/db.json)
│   ├── seed.js             # Dados iniciais (médicos, especialidades, usuário admin)
│   ├── utils/               # Validações (CPF, e-mail), máscaras, datas
│   ├── middleware/          # auth.js (sessão/papéis), csrf.js
│   ├── services/            # Regras de negócio — uma por história de usuário
│   └── routes/               # Controllers HTTP (um arquivo por área)
├── views/                   # Telas EJS (uma por tela) + views/admin (painel master)
├── public/                  # CSS e JS do cliente (sem framework)
└── data/                    # Banco de dados em JSON (gerado automaticamente, não versionado)
```

As rotas só conversam com os `services`, e só os `services` acessam `db.js`. Essa separação permite
trocar o armazenamento por um banco de dados real sem reescrever regra de negócio ou telas.

## Como testar

1. Acesse a página inicial e clique em **Criar minha conta**. Use um CPF válido, por exemplo
   `529.982.247-25`.
2. Faça login com o e-mail e a senha cadastrados.
3. Em **Médicos**, filtre por especialidade e clique em **Ver agenda e agendar**.
4. Escolha um dia e um horário livres e confirme o agendamento.
5. Em **Minhas consultas**, cancele uma consulta (disponível até 2h antes do horário).
6. Para testar o **lembrete**, agende uma consulta para menos de 24h a partir de agora (os
   horários exigem pelo menos 1h de antecedência) e aguarde até 1 minuto — o lembrete aparece em
   **Lembretes** e como aviso no topo da tela.
7. Para testar o **painel administrativo**, saia da conta de paciente e entre com as credenciais do
   administrador (ver `CREDENCIAIS.md`, gerado na primeira execução).

## Limitações conhecidas (próximos itens do backlog)

- Persistência em arquivo local — adequada para demonstração, não para múltiplos servidores
  simultâneos (produção exigiria um banco de dados real, ver seção de Segurança).
- Envio de e-mail/SMS simulado (sem integração com provedor externo).
- Sem auditoria/log de ações administrativas (quem alterou o quê e quando).

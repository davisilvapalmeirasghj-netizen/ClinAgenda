/*
 * Camada de dados (repositorio).
 * Persiste as "tabelas" em um arquivo JSON no servidor (data/db.json).
 * Centralizar o acesso aqui permite trocar o armazenamento por um banco
 * relacional (ex.: PostgreSQL) no futuro sem alterar os services.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ARQUIVO = path.join(DATA_DIR, 'db.json');

function lerDoDisco() {
  if (!fs.existsSync(ARQUIVO)) return {};
  try { return JSON.parse(fs.readFileSync(ARQUIVO, 'utf8')); }
  catch { return {}; }
}

function gravarNoDisco(dados) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(ARQUIVO, JSON.stringify(dados, null, 2), 'utf8');
}

let cache = lerDoDisco();

const Storage = {
  listar(tabela) {
    return cache[tabela] || [];
  },
  salvarTudo(tabela, itens) {
    cache[tabela] = itens;
    gravarNoDisco(cache);
  },
  inserir(tabela, item) {
    const t = this.listar(tabela);
    t.push(item);
    this.salvarTudo(tabela, t);
    return item;
  },
  atualizar(tabela, id, dados) {
    const t = this.listar(tabela);
    const i = t.findIndex(x => x.id === id);
    if (i < 0) return null;
    t[i] = { ...t[i], ...dados };
    this.salvarTudo(tabela, t);
    return t[i];
  },
  remover(tabela, id) {
    const t = this.listar(tabela).filter(x => x.id !== id);
    this.salvarTudo(tabela, t);
  },
  buscar(tabela, id) {
    return this.listar(tabela).find(x => x.id === id) || null;
  },
  lerValor(chave) {
    return cache[chave] ?? null;
  },
  gravarValor(chave, valor) {
    cache[chave] = valor;
    gravarNoDisco(cache);
  }
};

module.exports = Storage;

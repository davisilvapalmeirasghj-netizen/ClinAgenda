/* Validacoes e formatadores reutilizados pelos services e pelas views. */

const somenteDigitos = v => String(v ?? '').replace(/\D/g, '');

/** Valida CPF pelos digitos verificadores (algoritmo oficial da Receita Federal). */
const cpfValido = cpf => {
  const n = somenteDigitos(cpf);
  if (n.length !== 11 || /^(\d)\1{10}$/.test(n)) return false;
  const dv = len => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += Number(n[i]) * (len + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(n[9]) && dv(10) === Number(n[10]);
};

const emailValido = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e ?? '').trim());

const mascaraCPF = v => somenteDigitos(v).slice(0, 11)
  .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');

const mascaraTelefone = v => {
  const n = somenteDigitos(v).slice(0, 11);
  return n.length <= 10
    ? n.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
    : n.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
};

const gerarId = prefixo =>
  `${prefixo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

module.exports = { somenteDigitos, cpfValido, emailValido, mascaraCPF, mascaraTelefone, gerarId };

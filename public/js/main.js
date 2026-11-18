/* Pequenos realces de interface no cliente. Nada aqui é obrigatório para o
   funcionamento do sistema (toda regra de negócio roda no servidor). */
(() => {
  const somenteDigitos = v => v.replace(/\D/g, '');

  const mascaraCPF = v => somenteDigitos(v).slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');

  const mascaraTelefone = v => {
    const n = somenteDigitos(v).slice(0, 11);
    return n.length <= 10
      ? n.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
      : n.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  };

  const cpf = document.getElementById('cpf');
  if (cpf) cpf.addEventListener('input', () => { cpf.value = mascaraCPF(cpf.value); });

  const telefone = document.getElementById('telefone');
  if (telefone) telefone.addEventListener('input', () => { telefone.value = mascaraTelefone(telefone.value); });

  // Selects que devem recarregar a página ao mudar (filtros via GET)
  document.querySelectorAll('[data-auto-submit]').forEach(el => {
    el.addEventListener('change', () => el.form.submit());
  });

  // Formularios que pedem confirmacao antes de enviar (cancelamento, agendamento)
  document.querySelectorAll('form[data-confirmar]').forEach(form => {
    form.addEventListener('submit', e => {
      if (!window.confirm(form.dataset.confirmar)) e.preventDefault();
    });
  });

  // Fecha o aviso de flash message apos alguns segundos
  document.querySelectorAll('.avisos .aviso').forEach(aviso => {
    setTimeout(() => { aviso.style.display = 'none'; }, 8000);
  });
})();

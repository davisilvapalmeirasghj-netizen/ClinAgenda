/* Funcoes de data reutilizadas pelos services (datas sempre tratadas como horario local). */

const pad = n => String(n).padStart(2, '0');

/** Data local no formato AAAA-MM-DD. */
const dataISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Converte "AAAA-MM-DD" + "HH:MM" em Date local. */
const paraDate = (data, hora = '00:00') => {
  const [a, m, d] = data.split('-').map(Number);
  const [h, mi] = hora.split(':').map(Number);
  return new Date(a, m - 1, d, h, mi);
};

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const formatarData = data => {
  const d = paraDate(data);
  return `${DIAS[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const formatarDataCurta = data => {
  const d = paraDate(data);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};

module.exports = { pad, dataISO, paraDate, formatarData, formatarDataCurta, DIAS };

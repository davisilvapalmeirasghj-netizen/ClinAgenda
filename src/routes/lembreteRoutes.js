const express = require('express');
const router = express.Router();

const LembreteService = require('../services/lembreteService');
const { exigirLogin } = require('../middleware/auth');

router.get('/lembretes', exigirLogin, (req, res) => {
  const lista = LembreteService.historico(req.usuario.id);
  res.render('lembretes', { lista, janelaHoras: LembreteService.JANELA_HORAS });
});

module.exports = router;

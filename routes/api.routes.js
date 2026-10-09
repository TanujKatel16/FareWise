const express = require('express');
const router = express.Router();
router.use(require('./config.routes'));
router.use(require('./pricing.routes'));
router.use(require('./report.routes'));
router.use(require('./trap.routes'));
module.exports = router;

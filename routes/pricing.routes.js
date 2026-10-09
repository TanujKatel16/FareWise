const express = require('express');
const controller = require('../controllers/api.controller');
const asyncHandler = require('../middlewares/async-handler.middleware');
const router = express.Router();
router.post('/check', asyncHandler(controller.check));
module.exports = router;

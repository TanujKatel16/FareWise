const express = require('express');
const controller = require('../controllers/api.controller');
const asyncHandler = require('../middlewares/async-handler.middleware');
const router = express.Router();
router.post('/reports', asyncHandler(controller.createReport));
router.post('/complaints', asyncHandler(controller.createComplaint));
module.exports = router;

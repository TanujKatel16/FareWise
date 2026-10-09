const express = require('express');
const controller = require('../controllers/api.controller');
const asyncHandler = require('../middlewares/async-handler.middleware');
const router = express.Router();
router.get('/traps', asyncHandler(controller.listTraps));
router.get('/map-data', asyncHandler(controller.mapData));
router.get('/geocode', asyncHandler(controller.geocode));
module.exports = router;

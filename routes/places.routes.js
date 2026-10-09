const express = require('express');
const controller = require('../controllers/places.controller');
const asyncHandler = require('../middlewares/async-handler.middleware');
const router = express.Router();
router.get('/places/nearby', asyncHandler(controller.nearby));
router.get('/places/photo', asyncHandler(controller.photo));
router.post('/places/reviews', asyncHandler(controller.review));
module.exports = router;

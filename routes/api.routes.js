const express=require('express'),controller=require('../controllers/api.controller'),router=express.Router();
function asyncHandler(fn){return(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next)}
router.get('/config',asyncHandler(controller.config));
router.post('/check',asyncHandler(controller.check));
router.post('/reports',asyncHandler(controller.createReport));
router.post('/complaints',asyncHandler(controller.createComplaint));
router.get('/traps',asyncHandler(controller.listTraps));
router.get('/map-data',asyncHandler(controller.mapData));
router.get('/geocode',asyncHandler(controller.geocode));
module.exports=router;

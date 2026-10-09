const definitions={
 service_types:[[{id:1},{unique:true,sparse:true}], [{city:1,name:1},{unique:true}]],
 price_reports:[[{id:1},{unique:true,sparse:true}],[{city:1,service_type:1,created_at:-1},{}],[{city:1,distance_km:1},{}]],
 trap_entries:[[{id:1},{unique:true,sparse:true}],[{city:1,category:1},{}],[{lat:1,lng:1},{}]],
 complaints:[[{id:1},{unique:true,sparse:true}],[{city:1,created_at:-1},{}]],
 check_logs:[[{id:1},{unique:true,sparse:true}],[{created_at:-1},{}]]
};
async function ensureIndexes(database){for(const [collection,indexes] of Object.entries(definitions)){const model=database.collection(collection);for(const [keys,options] of indexes)await model.createIndex(keys,options)}}
module.exports={definitions,ensureIndexes};

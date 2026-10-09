const seed=require('../data/seed.json'),R=6371;
function distanceKm(a,b){const p=Math.PI/180,dLat=(b.lat-a.lat)*p,dLng=(b.lng-a.lng)*p,x=Math.sin(dLat/2)**2+Math.cos(a.lat*p)*Math.cos(b.lat*p)*Math.sin(dLng/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function nearestCity(lat,lng){return seed.cities.map(c=>({...c,distanceKm:distanceKm({lat,lng},c.center)})).sort((a,b)=>a.distanceKm-b.distanceKm)[0]}
async function geocode(query){const url=new URL('https://nominatim.openstreetmap.org/search');url.searchParams.set('format','jsonv2');url.searchParams.set('limit','5');url.searchParams.set('q',query);const response=await fetch(url,{headers:{'User-Agent':'Farewise/1.0 (traveler price checker)'}});if(!response.ok)throw new Error('Geocoding service unavailable');return response.json()}
module.exports={distanceKm,nearestCity,geocode};

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b),
    index = (sorted.length - 1) * p,
    low = Math.floor(index),
    fraction = index - low;
  return sorted[low] + (sorted[Math.ceil(index)] - sorted[low]) * fraction;
}
function weightedMean(rows) {
  const total = rows.reduce((s, x) => s + x.weight, 0);
  return total ? rows.reduce((s, x) => s + x.value * x.weight, 0) / total : 0;
}
function weightedQuantile(rows, p) {
  if (!rows.length) return 0;
  const sorted = [...rows].sort((a, b) => a.value - b.value),
    total = sorted.reduce((s, x) => s + x.weight, 0);
  let target = total * p;
  for (const row of sorted) {
    target -= row.weight;
    if (target <= 0) return row.value;
  }
  return sorted[sorted.length - 1].value;
}
function confidence(n) {
  return n >= 15 ? 'High' : n >= 5 ? 'Medium' : 'Low';
}
function blendWeight(n) {
  if (n < 5) return n * 0.035;
  if (n < 15) return 0.14 + (n - 5) * 0.055;
  return Math.min(0.82, 0.69 + (n - 15) * 0.01);
}
function chooseCity(input, seed, nearestCity) {
  if (input.city && seed.cities.some((c) => c.name === input.city))
    return seed.cities.find((c) => c.name === input.city);
  if (Number.isFinite(Number(input.lat)) && Number.isFinite(Number(input.lng)))
    return nearestCity(Number(input.lat), Number(input.lng));
  return seed.cities[0];
}
async function calculate(input, { data, geography, seed }) {
  const city = chooseCity(input, seed, geography.nearestCity),
    serviceName = input.service_type || input.service || 'Taxi',
    config =
      seed.services.find((s) => s.city === city.name && s.name === serviceName) ||
      seed.services.find((s) => s.city === city.name && s.name === 'Taxi');
  const distance = Math.max(0.2, Number(input.distance_km) || 5),
    quote = Number(input.price_quoted ?? input.price_paid ?? 0),
    baseline =
      config.pricing_model === 'per_km'
        ? config.base_fare + config.per_km_rate * distance
        : config.base_fare;
  const origin =
    input.origin_coords && Number.isFinite(Number(input.origin_coords.lat))
      ? { lat: Number(input.origin_coords.lat), lng: Number(input.origin_coords.lng) }
      : null;
  const candidates = (await data.reports())
    .filter((r) => r.city === city.name && r.service_type === config.name)
    .map((r) => {
      const distanceDelta =
          config.pricing_model === 'per_km'
            ? Math.abs(Number(r.distance_km || distance) - distance) / Math.max(1, distance)
            : 0,
        routeKm =
          origin && r.origin && Number.isFinite(Number(r.origin.lat))
            ? geography.distanceKm(origin, r.origin)
            : null;
      if (distanceDelta > 0.2 && !(routeKm !== null && routeKm < 12)) return null;
      const value =
          config.pricing_model === 'per_km'
            ? (Number(r.price_paid) / Math.max(0.2, Number(r.distance_km || distance))) * distance
            : Number(r.price_paid),
        weight = Math.exp(-distanceDelta * 2) * (routeKm === null ? 1 : Math.exp(-routeKm / 12));
      return { value, weight };
    })
    .filter(Boolean);
  const n = candidates.length,
    community = weightedMean(candidates),
    weight = blendWeight(n),
    fair = community ? weight * community + (1 - weight) * baseline : baseline,
    q1 = weightedQuantile(candidates, 0.25),
    q3 = weightedQuantile(candidates, 0.75),
    spread = community
      ? Math.min(0.15, Math.max(0.035, ((q3 - q1) / Math.max(1, community)) * 0.28))
      : 0.08;
  const fairLow = Math.max(1, Math.round(fair * (0.88 - spread))),
    fairHigh = Math.max(fairLow + 1, Math.round(fair * (1.12 + spread))),
    fairMid = Math.round((fairLow + fairHigh) / 2),
    ratio = quote ? quote / fairMid : 1;
  const localTraps = await data.trapList({
      city: city.name,
      ...(origin ? { lat: origin.lat, lng: origin.lng, radiusKm: 30 } : {}),
    }),
    nearby = localTraps
      .filter(
        (t) =>
          !input.service_type ||
          ['overcharge', 'hidden_charge', 'meter_tampering'].includes(t.category),
      )
      .slice(0, 3),
    riskAdjustment = nearby.reduce((s, t) => s + Math.max(0, 5 - Number(t.severity)) * 0.005, 0),
    adjusted = ratio + riskAdjustment,
    verdict = adjusted <= 1.2 ? 'Fair' : adjusted <= 1.58 ? 'Suspicious' : 'High Risk';
  const sampleRoute = n
      ? 'Based on ' + n + ' similar ' + config.name.toLowerCase() + ' fares'
      : 'No matching local fare reports yet; using the configured reference fare',
    signals = [
      quote
        ? Math.round((ratio - 1) * 100) +
          '% ' +
          (ratio >= 1 ? 'above' : 'below') +
          ' the estimated midpoint'
        : 'Add a quoted price to score this fare',
      sampleRoute,
      ...(nearby.length
        ? [nearby[0].report_count + ' local reports near ' + nearby[0].location]
        : []),
    ];
  return {
    verdict,
    ratio: Number(ratio.toFixed(2)),
    fair_low: fairLow,
    fair_high: fairHigh,
    fair_mid: fairMid,
    confidence: confidence(n),
    sample_size: n,
    nearby_traps: nearby,
    signals,
    currency: city.currency,
    baseline: Math.round(baseline),
    community_estimate: Math.round(community || 0),
    community_weight: Number(weight.toFixed(2)),
    distance_km: Number(distance.toFixed(1)),
    quote,
    city: city.name,
    state: city.state,
    service_type: config.name,
    counter_at: Math.max(1, Math.round(fairMid * 0.95)),
    walk_away_at: Math.round(fairHigh * 1.1),
    method: 'Reference fare blended with route-weighted community median and interquartile spread',
  };
}
module.exports = { calculate };

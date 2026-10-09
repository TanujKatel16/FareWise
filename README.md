# Farewise

A mobile-first traveler price checker prototype. Node.js 18+; no dependencies required.

## Run

```sh
npm start
```

Open http://localhost:3000. Set `OPENAI_API_KEY` to enable ChatGPT explanations; the app uses a deterministic explanation when no key is set or the API is unavailable. ChatGPT receives only the structured engine result and is explicitly instructed not to introduce new numbers or facts.

Reports are saved to `data/user-data.json` and immediately affect future checks. Optional receipt images are stored locally in `data/uploads/` (up to 5 MB; not analyzed). Seed data is in `data/seed.json`.

## Demo scenarios

Try an airport taxi in Bangkok at ฿900 (high risk), a tuk-tuk in Jaipur at ₹180 (fair), and an airport taxi in Lisbon at €50 (suspicious/high risk). Choose a city, service, route, and quote in Check. Map, scam database, and reporting are available from the navigation.

## Data and API

The prototype exposes `POST /api/check`, `POST /api/reports`, `POST /api/complaints`, `GET /api/traps?city=&type=`, `GET /api/map-data?city=`, and `GET /api/geocode?q=`. Map tiles and geocoding use public OpenStreetMap services. If geocoding is unavailable, popular route presets work without it and the engine uses Haversine distance when coordinates exist.

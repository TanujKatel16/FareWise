# Farewise

A mobile-first traveler fare checker focused on Assam and Northeast India. Built with Express routes/controllers/services/middleware, MongoDB collections and a deterministic fare engine. A local JSON adapter keeps the demo usable when MongoDB is not available.

## Run locally

1. Install Node.js 18 or newer and Docker Desktop.
2. Copy `.env.example` to `.env`.
3. Start MongoDB with `docker compose up -d`.
4. Install dependencies with `npm install`.
5. Load the Northeast seed records with `npm run seed`.
6. Start the app with `npm start` and open http://localhost:3000.

If MongoDB is stopped or not configured, the server logs that it is using `data/user-data.json` and continues using the seed records. Price reports and complaints are saved to MongoDB when connected, otherwise to the local JSON store. Optional receipt images are saved under `data/uploads/` and are not analyzed.

## Location

On localhost or HTTPS, the browser asks permission to share your current location. Farewise chooses the nearest supported city, uses your coordinates to filter nearby scam reports, and marks your position on the map. If location permission is declined, choose a city manually. Precise coordinates are used for the current check and map request but removed from saved check inputs.

## Coverage and seed data

The repeatable seed builder creates 216 fare records across Guwahati, Shillong, Silchar, Imphal, Kohima and Itanagar, plus 35 scam tips. Guwahati data includes Assam Engineering College, Jalukbari, the airport, railway station and nearby destinations. Regenerate the JSON seed with `npm run build:seed`; seed MongoDB with `npm run seed`.

## Fare calculation

1. Calculate a reference price from the city/service configuration and trip distance.
2. Select same-city, same-service reports with comparable distances; when pickup coordinates are available, weight them by route proximity.
3. Normalize distance fares to the entered trip length, then calculate a weighted community estimate and 25th–75th percentile spread.
4. Blend the community estimate with the reference fare according to sample size (up to 82% community weight). Low sample counts therefore lean strongly on the reference price.
5. Score the quote against the fair midpoint and return a verdict, sample size, confidence, signals, and nearby scam tips.

ChatGPT can explain the deterministic result when `OPENAI_API_KEY` is configured. It does not set or alter prices. A local template is used when ChatGPT is not configured or unavailable.

## Project structure

- `routes/` — Express API routes
- `controllers/` — request validation and response handling
- `services/` — fare calculation, data access, location and explanation logic
- `middlewares/` — Express setup, request parsing, headers and error handling
- `config/` — environment and MongoDB setup
- `models/` — reserved for persisted collection models as the prototype grows
- `scripts/` — repeatable region seed generation and MongoDB seeding
- `data/seed.json` — city/service reference data and starter reports

API: `POST /api/check`, `POST /api/reports`, `POST /api/complaints`, `GET /api/traps`, `GET /api/map-data`, `GET /api/geocode`, and `GET /api/config`.


# Farewise

A traveler discovery and fair fare app focused on Assam, Northeast India and Jaipur, Rajasthan. Built with Express routes/controllers/services/middleware, MongoDB collections, a deterministic fare engine and a local JSON adapter for demos.

## Run locally

1. Install Node.js 18 or newer and Docker Desktop.
2. Copy `.env.example` to `.env`.
3. Start MongoDB with `docker compose up -d`.
4. Install dependencies with `npm install`.
5. Load the regional seed records with `npm run seed`.
6. Start the app with `npm start` and open http://localhost:3000.

If MongoDB is stopped or not configured, the server logs that it is using `data/user-data.json` and continues using the seed records. Price reports and complaints are saved to MongoDB when connected, otherwise to the local JSON store. Optional receipt images are saved under `data/uploads/` and are not analyzed.

## Nearby places, photos and reviews

The Explore landing page lists regional destinations, traveller ratings and reviews. The demo includes destinations near Guwahati/AEC, Shillong, Silchar, Imphal, Kohima and Itanagar. Seed ratings and review snippets are labelled as demo data; traveler-submitted ratings, notes and photos are stored separately.

For live nearby attractions, Google ratings, reviews and photos, create a Google Cloud project, enable billing and **Places API (New)**, then create a server-side API key restricted to Places API. Add `GOOGLE_MAPS_API_KEY=...` to `.env`. The key is only used by the server. Google place photos are proxied without caching and display available photo/review attribution. Google Maps Platform usage can incur charges; configure quota limits and budget alerts in the Cloud project. Without a key, demo place cards use Commons imagery when available and clearly show demo review data.

The browser uses the device's location only after the user grants the site permission. If access was denied earlier, allow location for `localhost` in the browser's site settings and select **Find places near me**. With a Google key, places are searched around the exact coordinates. Without one, seeded destinations across Assam, Northeast India and Jaipur are sorted by distance, and distances are shown so the user can see when local coverage is not available. Jaipur includes demo records around MNIT Jaipur and Malviya Nagar.

The Explore page accepts a 1–5 star review, written travel note, optional display name and optional photo (maximum 5 MB). Photos are stored under `data/uploads/` and served with that review. Configure HTTPS and an external persistent upload store before hosting publicly.

## Location

On localhost or HTTPS, the browser asks permission to share your current location. Farewise chooses the nearest supported city, uses your coordinates to filter nearby scam reports, and marks your position on the map. If location permission is declined, choose a city manually. Precise coordinates are used for the current check and map request but removed from saved check inputs.

## Coverage and seed data

The repeatable seed builder creates 336 fare records across Guwahati, Shillong, Silchar, Imphal, Kohima, Itanagar and Jaipur, plus 40 demo travel tips. Jaipur data is centered near MNIT and Malviya Nagar and includes sample fares to local landmarks. Guwahati data includes Assam Engineering College, Jalukbari, the airport, railway station and nearby destinations. Regenerate the JSON seed with `npm run build:seed`; seed MongoDB with `npm run seed`.

The Check flow supports place autocomplete through the geocoding proxy, current-location pickup, map pin selection for pickup or destination, and straight-line Haversine distance when both route points are known. Guides and restaurants use a single place field. The map supports city and service filters, proximity-aware reports, density-scaled risk markers, and typical overcharge estimates. The trap database supports city, service, category and text filters. Price reports feed back into the next fare calculation immediately.

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
- `models/` — MongoDB collection indexes for services, reports, traps, complaints and check logs
- `scripts/` — repeatable region seed generation and MongoDB seeding
- `data/seed.json` — city/service reference data and starter reports
- `public/js/` — separate browser modules for discovery, ratings/reviews, navigation, pricing, geolocation, route search, maps, and reports
- `public/styles/` — base, discovery, route form, map, and finishing styles
- `data/places.json` — demo places across the Northeast and Jaipur; Google Places can return current nearby results

Run `npm run format` before committing; `npm run format:check` checks the repository with Prettier.

API: `POST /api/check`, `POST /api/reports`, `POST /api/complaints`, `GET /api/traps`, `GET /api/map-data`, `GET /api/geocode`, `GET /api/places/nearby`, `GET /api/places/photo`, `POST /api/places/reviews`, and `GET /api/config`.

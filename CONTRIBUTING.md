# Contributing

Thanks for helping improve Farewise. Contributions should keep fare estimates explainable, traveler data handled carefully, and prototype data clearly distinguished from verified reports.

## Before you start

- Check existing issues and pull requests for related work.
- For a significant change, open an issue first to discuss scope and approach.
- Keep pull requests focused and describe the user-facing behavior they change.

## Local setup

1. Install Node.js 18 or newer.
2. Clone the repository and run `npm ci`.
3. Optionally copy `.env.example` to `.env` and configure MongoDB or optional integrations.
4. Run `npm start`, then open `http://localhost:3000`.

The app can run with its local JSON fallback when MongoDB is unavailable. See the README for MongoDB setup and integration configuration.

## Change guidelines

- Preserve the routes/controllers/services separation.
- Keep numeric fare calculations in the deterministic pricing service; do not let an LLM set a fare or verdict.
- Clearly mark generated or synthetic data. Do not present it as verified traveler activity.
- Validate user input and avoid collecting more personal or location data than a feature needs.
- Keep API keys and credentials in untracked environment files. Never add secrets, local user data, or uploaded images to a commit.
- Include relevant documentation updates with behavior or configuration changes.

## Before opening a pull request

Run the formatting check:

```bash
npm run format:check
```

The repository does not yet include an automated test suite. Manually exercise the affected flow and describe what you verified in the pull request.

## Pull request description

Please include:

- What changed and why
- Any configuration or migration steps
- The flows you manually verified
- Screenshots for user-interface changes, when useful
- Known limitations or follow-up work

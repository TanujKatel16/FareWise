# Security policy

## Project status

Farewise is a prototype and is not currently designed for unrestricted public deployment. It does not yet include user authentication, rate limiting, a full content-moderation workflow, or production-grade upload controls. Do not use it to store sensitive information or expose an unconfigured instance to the public internet.

## Reporting a vulnerability

Please do not publish credentials, personal data, or a working exploit in a public issue. Use GitHub's private vulnerability reporting for this repository if it is enabled. Otherwise, contact the repository maintainer privately through GitHub before sharing details publicly.

## Secret handling

- Keep `.env` files, API keys, database credentials, and tokens out of commits.
- Restrict third-party API keys to the required APIs and keep server-side keys out of browser code.
- If a key is exposed, revoke it with its provider and replace it; removing it from the latest commit alone is not sufficient.

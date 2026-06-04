# Validation Summary: How to Run Sentry in Docker for Error Tracking

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Sentry self-hosted
- Docker
- Docker Compose
- PostgreSQL
- Redis
- Kafka
- ClickHouse
- Python
- Flask
- Sentry Python SDK
- Sentry JavaScript Browser SDK
- Sentry CLI
- Source maps

## Sources Consulted
- Sentry self-hosted documentation: https://develop.sentry.dev/self-hosted/
- Sentry self-hosted configuration examples from the official getsentry/self-hosted repository: https://github.com/getsentry/self-hosted
- Sentry self-hosted release tags from the official getsentry/self-hosted repository: https://github.com/getsentry/self-hosted/releases
- Sentry CLI release management documentation: https://docs.sentry.io/cli/releases/
- Sentry CLI configuration and authentication documentation: https://docs.sentry.dev/cli/configuration/
- Sentry JavaScript tracing documentation: https://docs.sentry.io/platforms/javascript/tracing/
- Sentry Python Flask integration documentation: https://docs.sentry.io/platforms/python/integrations/flask/
- Docker Compose CLI documentation / local `docker compose version` output.
- Local `sentry-cli` 3.5.0 `--help` output for `releases new` and `sourcemaps upload`.
- PyPI package index version checks for Flask and sentry-sdk.
- Sentry browser CDN availability check for `https://browser.sentry-cdn.com/10.56.0/bundle.tracing.min.js`.

## Issues Found
- The post described Sentry as open source. Sentry's current licensing is Fair Source / source-available, with source becoming open source after the license delay, so the wording was changed to "source-available."
- The self-hosted resource requirements omitted 16GB of swap and minimum Docker / Docker Compose versions. Updated the prerequisites to match Sentry's self-hosted documentation.
- The install commands checked out the outdated `24.2.0` tag. Replaced the hard-coded tag with Sentry's documented pattern for resolving and checking out the latest stable release.
- The startup command used `docker compose up -d`. Sentry's current installer recommends `docker compose up --wait`, so the command was updated.
- The configuration snippet set event retention directly in `sentry/sentry.conf.py` and included invalid or stale rate-limit options. Replaced it with `SENTRY_EVENT_RETENTION_DAYS` in `.env.custom` and kept only a valid Python configuration example.
- The Flask example used older package pins. Updated Flask to `3.1.3` and `sentry-sdk[flask]` to `2.61.1`.
- The Docker Compose DSN used `sentry-web`, which is not the service name in the official self-hosted compose file. Updated it to `web`.
- The browser SDK CDN version was old. Updated the CDN URL to the current `10.56.0` browser tracing bundle and verified that it is available.
- The source-map upload example used `sentry-cli releases files ... upload-sourcemaps`, which is no longer available in current `sentry-cli`. Updated it to configure `SENTRY_URL` / `SENTRY_AUTH_TOKEN` and use `sentry-cli sourcemaps upload --release`.
- The conclusion claimed self-hosted Sentry provides the same capabilities as hosted Sentry and "no event limits." Sentry documents SaaS/self-hosted differences, so the wording now says "many of the same core capabilities" and "no per-event billing limits."

## Review Notes
The Python and JavaScript SDK examples use high sample rates for demonstration. For production systems, teams should lower trace sampling based on traffic volume and data-retention needs.

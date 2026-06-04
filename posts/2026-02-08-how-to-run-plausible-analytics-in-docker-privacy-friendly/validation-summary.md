# Validation Summary: How to Run Plausible Analytics in Docker (Privacy-Friendly)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Plausible Analytics Community Edition
- Docker
- Docker Compose
- PostgreSQL
- ClickHouse
- Nginx reverse proxying
- Traefik routing labels
- Plausible tracking script and custom events
- Plausible Stats API
- Google Analytics import
- OpenSSL secret generation

## Sources Consulted
- Plausible Community Edition quickstart: https://github.com/plausible/community-edition
- Plausible CE configuration wiki: https://github.com/plausible/community-edition/wiki/Configuration
- Plausible CE current compose file: https://raw.githubusercontent.com/plausible/community-edition/v3.2.1/compose.yml
- Plausible CE ClickHouse config files: https://github.com/plausible/community-edition/tree/v3.2.1/clickhouse
- Plausible tracking script docs: https://plausible.io/docs/plausible-script
- Plausible optional measurements docs: https://plausible.io/docs/script-extensions
- Plausible custom event docs: https://plausible.io/docs/custom-event-goals
- Plausible Nginx proxy docs: https://plausible.io/docs/proxy/guides/nginx
- Plausible Stats API reference: https://plausible.io/docs/stats-api
- Plausible Google Analytics import docs: https://plausible.io/docs/google-analytics-import
- Docker Compose CLI check: `docker compose version`
- Docker Compose config validation: `docker compose -f /tmp/plausible-compose.yml config`
- OpenSSL CLI check: `openssl version`

## Issues Found
- The Docker Compose snippet used an outdated Plausible CE image tag and omitted the current startup command and persistent Plausible data volume. Updated it to `ghcr.io/plausible/community-edition:v3.2.1`, added the official `createdb`, `migrate`, and `run` command, and added the required runtime volume and `TMPDIR`.
- The Compose file included the obsolete top-level `version` key. Removed it to match current Docker Compose usage and the official Plausible CE compose file.
- The ClickHouse image and configuration snippets did not match the current Plausible CE setup. Updated the ClickHouse image to `24.12-alpine`, added log and low-resource config mounts, added `CLICKHOUSE_SKIP_USER_SETUP`, and replaced the old logging snippets with the current official-style config files.
- The prerequisites omitted ClickHouse CPU instruction requirements. Added the SSE 4.2 or NEON requirement from the Plausible CE quickstart.
- The article claimed the tracking script was under 1 KB. The current public script is larger than that, so the wording was changed to "lightweight" while preserving the performance point.
- The optional measurement snippet used old script-extension file names and mentioned 404 tracking as part of that combined script. Updated it to the current `plausible.init()` options for outbound links, file downloads, and form submissions.
- The Nginx proxy example did not forward the visitor IP and related proxy headers. Added `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Forwarded-Host`, and HTTP/1.1 settings per Plausible's proxy documentation.
- The proxied tracking snippet used the old `data-api` attribute. Updated it to initialize the tracker with `endpoint: "/api/event"`.
- The Stats API examples used legacy v1 GET endpoints. Updated them to the current `/api/v2/query` POST endpoint with JSON request bodies.
- The Google Analytics import section said Plausible reads from a Google Analytics export file. Updated it to reflect the current GA4 import flow using Google OAuth credentials and property selection.
- Secret generation wording mixed character length and byte length. Updated the comments to match Plausible CE's `SECRET_KEY_BASE` and `TOTP_VAULT_KEY` documentation.

## Review Notes
The post is technically relevant and salvageable. The updated Compose example was syntax-checked with `docker compose config`; the stack was not started because that would pull and run multiple production services.

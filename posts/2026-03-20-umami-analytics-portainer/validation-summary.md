# Validation Summary: How to Deploy Umami Analytics via Portainer

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Umami Analytics (v2.x / v3.x)
- Portainer (CE / BE)
- Docker / Docker Compose
- PostgreSQL 15
- MySQL 8.0
- Traefik (reverse proxy)
- HTML / JavaScript (tracking script and API)

## Sources Consulted
- Umami official installation docs: https://docs.umami.is/docs/install
- Umami environment variables reference: https://docs.umami.is/docs/environment-variables
- Umami tracker functions docs: https://docs.umami.is/docs/tracker-functions
- Umami GitHub repository: https://github.com/umami-software/umami
- Umami GHCR container registry: https://github.com/umami-software/umami/pkgs/container/umami
- Umami v2 docs (MySQL support): https://v2.umami.is/docs/install

## Issues Found
No technical issues found.

Verified items:
- Docker image `ghcr.io/umami-software/umami:postgresql-latest` exists and is currently published on GHCR.
- Docker image `ghcr.io/umami-software/umami:mysql-latest` exists and is currently published on GHCR.
- `APP_SECRET` is the correct environment variable for securing auth tokens (per official environment variables docs).
- `DISABLE_TELEMETRY` is a valid runtime environment variable.
- Default credentials (`admin` / `umami`) match official documentation.
- PostgreSQL 15-alpine satisfies Umami's minimum version (v12.14+).
- MySQL 8.0 satisfies Umami's minimum version (v8.0+).
- `pg_isready -U umami -d umami` is valid Postgres healthcheck syntax.
- The `umami.track('event-name', { ...data })` call signature is correct.
- The `umami.track({ url, title })` custom-payload form is correct.
- Tracking script tag (`script.js` with `data-website-id`) matches Umami's documented embed format.
- Default port 3000 is correct for the Docker image.
- Traefik label syntax is valid for Traefik v2/v3 dynamic configuration.

## Review Notes
- `BASE_PATH` is technically documented by Umami as a **build-time** variable rather than a runtime variable, so setting it via the Docker `environment:` block on a prebuilt image will not have any effect. The post correctly leaves it commented out as "Optional", so it is not actively misleading, but readers wanting a custom base path would need to build their own image.
- The Compose file uses `version: "3.8"`, which is now considered obsolete in newer Docker Compose CLI versions (Compose v2 ignores the field with a warning). It still works without issue in Portainer and is harmless.
- The hard-coded passwords (`umamipassword`, `rootpassword`) are obviously placeholders; the post should ideally remind users to change them, but this is a stylistic note rather than a technical error.
- Umami also offers an official `docker.umami.is/umami-software/umami:latest` mirror in addition to the GHCR images used in the post; both are valid sources.

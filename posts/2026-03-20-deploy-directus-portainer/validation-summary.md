# Validation Summary: How to Deploy Directus via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Directus (v10.13.0) — open-source headless CMS / data platform
- Portainer — Docker management UI
- Docker / Docker Compose (v3.8 schema)
- PostgreSQL 16 (alpine image)
- Redis 7 (alpine image, used for cache)
- Directus REST API
- Directus GraphQL API
- Directus assets/image transformation API

## Sources Consulted
- Directus official documentation: https://docs.directus.io/
- Directus configuration / environment variable reference: https://docs.directus.io/self-hosted/config-options.html
- Directus Docker image on Docker Hub: https://hub.docker.com/r/directus/directus
- Directus REST API reference (auth, items, files, assets endpoints)
- Directus GraphQL endpoint documentation (`/graphql`)
- Postgres official Docker image (postgres:16-alpine)
- Redis official Docker image (redis:7-alpine)
- Docker Compose `depends_on` with `condition: service_healthy` semantics

## Issues Found
- **Underestimated RAM requirement.** The Prerequisites section listed "At least 1 GB RAM" as the minimum. Running Directus alongside PostgreSQL 16 and Redis 7 in the same compose stack reliably needs more headroom than 1 GB — Directus alone is typically ~512 MB–1 GB, Postgres realistically ~512 MB, plus Redis. Under any meaningful load or during extension installs/migrations a 1 GB host is likely to OOM. Updated the prerequisite to "At least 2 GB RAM" as a more honest minimum for a small but stable deployment.

## Review Notes
- **Directus version (10.13.0):** Valid and exists on Docker Hub. By 2026 the Directus 11.x line is current; the post pins to a 10.x release which is fine and stable, but readers may want to consult the latest tag for new features and security patches.
- **`version: "3.8"` in compose:** Still accepted by Docker Compose but the top-level `version` key is ignored by Compose v2+; it can be omitted in modern setups. Not a correctness issue.
- **`PUBLIC_URL=http://${DIRECTUS_DOMAIN}:8055`:** Correct env var. The conclusion correctly warns that this must match the actual reachable URL or generated file/share links will be broken. For real deployments behind TLS/Caddy/Traefik, this should be `https://your.domain` without a port.
- **`REDIS` env var:** Directus accepts a single Redis connection string via `REDIS` and reuses it for the cache (when `CACHE_STORE=redis`), rate limits, websockets, etc. Correctly used here.
- **Image transformations on `/assets/<file-id>`:** Arbitrary `width`/`height`/`fit` query params work out of the box, but production deployments often want to restrict transforms via `ASSETS_TRANSFORM_*` env vars (e.g. `ASSETS_TRANSFORM_MAX_OPERATIONS`, allowed presets) to prevent abuse. Not strictly needed for a getting-started guide but worth being aware of.
- **`ADMIN_EMAIL` / `ADMIN_PASSWORD`:** Only used to bootstrap the very first admin user. Changing them later in env will not change the existing admin's credentials — those must be updated in the admin UI. Not a bug in the post, just a behavior worth knowing.
- **Healthcheck commands** (`pg_isready -U directus`, `redis-cli ping`) are correct and standard.
- **API endpoints** (`/auth/login`, `/items/<collection>`, `/graphql`, `/files`, `/assets/<id>`) all match current Directus REST conventions.

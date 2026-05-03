# Validation Summary: How to Deploy an API Gateway with Portainer - Deploy

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Kong API Gateway (3.6)
- PostgreSQL 16 (alpine)
- Konga dashboard (pantsel/konga)
- Docker Compose (v3.8)
- Portainer (deployment context)
- Kong Admin API (services, routes, plugins, rate-limiting)

## Sources Consulted
- Kong official Docker installation docs: https://docs.konghq.com/gateway/latest/install/docker/
- Kong configuration reference (env vars): https://docs.konghq.com/gateway/latest/reference/configuration/
- Kong migrations CLI reference: https://docs.konghq.com/gateway/latest/reference/cli/#kong-migrations
- Kong Admin API reference (Service / Route / Plugin objects): https://docs.konghq.com/gateway/latest/admin-api/
- Kong Rate Limiting plugin docs: https://docs.konghq.com/hub/kong-inc/rate-limiting/
- Kong Admin API `/status` endpoint: https://docs.konghq.com/gateway/latest/admin-api/#retrieve-node-status
- Docker Hub: official `kong` image (tag 3.6) and `postgres:16-alpine`
- Docker Hub: `pantsel/konga` image

## Issues Found
No technical issues found.

Verified specifics:
- `kong:3.6` is a real published image tag (Kong 3.6.x, released February 2024).
- `postgres:16-alpine` is a valid official Postgres image.
- Environment variables `KONG_DATABASE`, `KONG_PG_HOST`, `KONG_PG_USER`, `KONG_PG_PASSWORD`, `KONG_PG_DATABASE`, `KONG_PROXY_ACCESS_LOG`, `KONG_ADMIN_ACCESS_LOG`, `KONG_PROXY_ERROR_LOG`, `KONG_ADMIN_ERROR_LOG`, and `KONG_ADMIN_LISTEN` are documented and correct.
- Default ports 8000 (HTTP proxy), 8443 (HTTPS proxy), and 8001 (Admin API) match Kong's defaults.
- `kong migrations bootstrap` is the correct command to initialize the schema for a fresh PostgreSQL backend.
- Admin API endpoints `POST /services`, `POST /services/{service}/routes`, and `POST /services/{service}/plugins` are correct, as are field names (`name`, `url`, `paths`, `strip_path`).
- The `rate-limiting` plugin accepts a `config.minute` integer and `config.policy` (`local`, `cluster`, `redis`); the example values are valid.
- Kong's Admin API exposes a `/status` endpoint suitable for liveness/health monitoring.

## Review Notes
- The `kong` service uses `depends_on: kong-db` but does not depend on `kong-migration`. In practice Kong will fail-fast and the `restart: unless-stopped` policy normally lets it recover after migrations finish, but adding a dependency on `kong-migration` would eliminate the race entirely. This is a hardening suggestion, not a correctness issue, so no change was made.
- `pantsel/konga` is functional but is no longer actively maintained and has known compatibility limitations with Kong 3.x (some newer Admin API features are not surfaced in the UI). The post uses it only as a basic dashboard, which works, but readers may want to consider alternatives such as the Kong Manager (OSS) UI in newer Kong versions for full feature coverage.
- The Compose `version: "3.8"` key is harmless but is now obsolete in modern Compose Spec / Docker Compose v2 (the field is ignored). Keeping it does not break anything.
- Hard-coded `kongpass` is correctly flagged with a "Change this" comment; readers should also avoid embedding it in environment values for the `kong` and `kong-migration` services in production (use Docker secrets or `.env`).

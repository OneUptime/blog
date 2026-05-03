# Validation Summary: How to Deploy Authentik via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Authentik (identity provider, version 2024.2)
- Portainer (Docker stack manager)
- Docker Compose
- PostgreSQL 16
- Redis 7
- OAuth2 / OpenID Connect
- LDAP / SAML / SCIM (mentioned)

## Sources Consulted
- Authentik Docker Compose installation docs: https://docs.goauthentik.io/docs/install-config/install/docker-compose
- Official Authentik 2024.2 docker-compose.yml: https://raw.githubusercontent.com/goauthentik/authentik/version-2024.2/docker-compose.yml
- Authentik configuration reference: https://docs.goauthentik.io/docs/install-config/configuration/
- Authentik 2024.2 source code (`authentik/root/monitoring.py`, `authentik/root/urls.py`, `internal/web/web.go`) for verifying health endpoints
- GitHub Container Registry manifest API for verifying image tag `ghcr.io/goauthentik/server:2024.2` exists

## Issues Found
1. **Monitoring section, health endpoint return code.** The post originally claimed the `/-/health/ready/` endpoint returns `200 OK`. Inspection of the upstream `ReadyView` in `authentik/root/monitoring.py` confirms it returns HTTP `204 No Content` on success and `503` if SQL or Redis is unavailable. Updated the post to reflect the correct status codes.
2. **Monitoring section, what the readiness endpoint checks.** The post claimed the endpoint reports healthy "when both the server and worker are healthy." The readiness probe only checks the server process's ability to reach the database and Redis — it does not verify the worker. Updated wording to "database and Redis are reachable, and `503` if either is down."

## Review Notes
- The compose stack uses `postgres:16-alpine` while the official Authentik 2024.2 compose pins `postgres:12-alpine`. PostgreSQL 16 is supported by Authentik (any 12+ is supported per the docs) and is actually a better choice since PostgreSQL 12 reached EOL in November 2024, so this was kept as-is.
- The image tag `ghcr.io/goauthentik/server:2024.2` (major.minor floating tag) was verified to exist in the registry. As of 2026-05-03 it is roughly two years old; the current Authentik release is `2026.2.x`. Readers may want to use a newer tag, but 2024.2 is still functional and the post's configuration shape is unchanged in newer versions.
- The post intentionally omits some optional pieces from the upstream compose (the `/data`, `/templates`, `/certs` volumes, `user: root` and `/var/run/docker.sock` on the worker, `shm_size: 512mb`, healthchecks). These are not required for a working basic deployment, so omission is acceptable for an introductory tutorial. Readers who want the embedded Docker outpost integration would need the docker socket bind-mount on the worker.
- The Redis `--save 60 1 --loglevel warning` command and all `AUTHENTIK_REDIS__*` / `AUTHENTIK_POSTGRESQL__*` environment variable names were verified against the upstream 2024.2 compose file and configuration docs.
- Setup URL `/if/flow/initial-setup/` and OAuth2/OpenID Provider creation steps are accurate.

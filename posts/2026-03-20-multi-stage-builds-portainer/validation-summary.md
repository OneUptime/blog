# Validation Summary: How to Use Multi-Stage Builds and Deploy via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Portainer (CE/BE)
- Docker / Docker Compose
- PostgreSQL 15 (alpine)
- Redis 7 (alpine)
- Nginx (alpine) as reverse proxy with TLS
- Uptime Kuma for monitoring
- Bash scripting (backup automation)

## Sources Consulted
- Docker Compose specification: https://docs.docker.com/reference/compose-file/
- Docker Compose healthcheck reference: https://docs.docker.com/reference/compose-file/services/#healthcheck
- Docker Compose `depends_on` with `condition: service_healthy`: https://docs.docker.com/reference/compose-file/services/#depends_on
- PostgreSQL `pg_isready` docs: https://www.postgresql.org/docs/current/app-pg-isready.html
- PostgreSQL `pg_dump` docs: https://www.postgresql.org/docs/current/app-pgdump.html
- Redis `redis-cli ping` reference: https://redis.io/docs/latest/commands/ping/
- Nginx `ssl_protocols` / `ssl_ciphers` directives: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Portainer Stacks documentation: https://docs.portainer.io/user/docker/stacks
- Docker Hub images verified: `postgres:15-alpine`, `redis:7-alpine`, `nginx:alpine`, `louislam/uptime-kuma:latest`

## Issues Found
1. **Incorrect network connectivity test using `curl` against PostgreSQL port** (Troubleshooting section).
   - **What was wrong:** The line `docker exec app curl -I http://postgres:5432` attempts an HTTP HEAD request against PostgreSQL's TCP port. PostgreSQL speaks its own binary wire protocol, not HTTP, so this command does not return a meaningful connectivity result — it will hang or print a protocol/parse error rather than confirming TCP reachability.
   - **What I changed:** Replaced it with `docker exec app nc -zv postgres 5432`, which is the standard way to verify raw TCP connectivity to a non-HTTP service.
   - **Why:** This change preserves the intent of the troubleshooting step (verify that the app container can reach PostgreSQL on the network) while using a tool that is actually appropriate for a non-HTTP TCP service.

## Review Notes
- The post title and introduction promise coverage of "Multi-Stage Builds," but the body does not include a sample multi-stage Dockerfile (e.g., `FROM ... AS builder` followed by a slim runtime stage). The deployment portion via Portainer/Compose is technically accurate, so this is a scope/content gap rather than a correctness issue and was left untouched per the instruction to avoid adding new sections.
- `version: "3.8"` at the top of the Compose file is harmless but obsolete — Docker Compose v2 ignores the top-level `version` field and will emit a deprecation warning. Left as-is since it still parses correctly and changing it is stylistic, not a correctness fix.
- `docker exec app pg_isready -h postgres -U appuser` assumes the `pg_isready` client is installed in the application image. This is reasonable for app images that bundle libpq/postgres-client but may not work for minimal images. Reasonable as troubleshooting guidance.
- `nc` is also not always installed in minimal images; if the app image is a distroless or scratch-based runtime, operators may need to attach a debug sidecar. This is a general Docker troubleshooting caveat, not an error in the post.
- The nginx `ssl_ciphers` list is restrictive (only ECDHE-RSA AES256-GCM-SHA512 / DHE-RSA AES256-GCM-SHA512). It is technically valid but pairs poorly with TLS 1.3 (TLS 1.3 has its own cipher suites and ignores this directive). This is a hardening preference rather than a bug.
- The healthcheck for the `app` service uses `curl` against `localhost:8080/health` — this requires `curl` to be present in the application image, which is a common assumption but worth flagging for minimal base images.

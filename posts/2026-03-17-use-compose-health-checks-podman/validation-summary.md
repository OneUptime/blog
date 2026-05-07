# Validation Summary: How to Use Compose Health Checks with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- podman-compose
- Compose Specification
- Container health checks
- PostgreSQL
- MySQL
- Redis
- Nginx

## Sources Consulted
- Compose Specification, `healthcheck` and `depends_on`: https://compose-spec.github.io/compose-spec/spec.html
- Podman `podman healthcheck` documentation: https://docs.podman.io/en/stable/markdown/podman-healthcheck.1.html
- Podman `podman run` health check options: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman compose` documentation: https://docs.podman.io/en/v5.3.0/markdown/podman-compose.1.html
- podman-compose release notes for `depends_on` condition support: https://github.com/containers/podman-compose/releases
- Official container images were checked locally with Docker for command availability: `nginx:alpine`, `postgres:16-alpine`, `mysql:8`, `redis:7-alpine`, `python:3.12-slim`, and `node:20-alpine`.

## Issues Found
- The `start_period` explanation said it was a grace period before checks begin. Podman and Compose-compatible health checks may run during the start period; failures are not counted as unhealthy until the grace period expires. Updated the wording to say failures do not count during that period.

## Review Notes
- The Compose `healthcheck` fields and `depends_on.condition: service_healthy` syntax are valid in the Compose Specification.
- Recent `podman-compose` releases support honoring `depends_on` conditions. Older versions before this support was added may not enforce `service_healthy` ordering correctly.
- Podman was not installed in this workspace, so Podman CLI behavior was verified against official documentation rather than local `podman --help` output.

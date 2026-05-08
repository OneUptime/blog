# Validation Summary: How to Add a Health Check to a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container health checks
- Containerfile / Dockerfile HEALTHCHECK
- PostgreSQL container readiness checks
- HTTP health check commands

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman healthcheck run` documentation: https://docs.podman.io/en/latest/markdown/podman-healthcheck-run.1.html
- Dockerfile `HEALTHCHECK` reference: https://docs.docker.com/reference/dockerfile/#healthcheck
- Docker Official Image documentation for PostgreSQL: https://hub.docker.com/_/postgres/
- Local Docker checks of `nginx:latest`, `node:18-alpine`, and `postgres:15` image command availability

## Issues Found
- The post stated that any non-zero health check exit code marks a container unhealthy. Podman applies health check failures through the configured retry behavior, so the explanation was updated to say failed checks count toward the configured retry limit and the container becomes unhealthy after the allowed retries are exceeded.
- The PostgreSQL example used `postgres:15` without setting `POSTGRES_PASSWORD`. The official PostgreSQL image requires this environment variable for normal startup, so the example now includes `-e POSTGRES_PASSWORD=example`.
- The PostgreSQL example was labeled as a TCP port check using bash, but it actually uses PostgreSQL's `pg_isready` readiness probe. The comment was corrected to "PostgreSQL readiness check."

## Review Notes
Podman was not installed in the local environment, so Podman-specific CLI behavior was verified against official Podman documentation rather than local `podman --help` output. Docker was available locally and was used only to verify command availability inside the referenced container images.

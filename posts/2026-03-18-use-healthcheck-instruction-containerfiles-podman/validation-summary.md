# Validation Summary: How to Use HEALTHCHECK Instruction in Containerfiles for Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Containerfiles / Dockerfile `HEALTHCHECK`
- Podman Quadlet / systemd integration
- Compose / `podman compose`
- PostgreSQL (`pg_isready`)
- Node.js / npm
- Python health checks
- Redis health checks

## Sources Consulted
- Podman build docs: https://docs.podman.io/en/v4.8.0/markdown/podman-build.1.html
- Podman run docs: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman healthcheck run docs: https://docs.podman.io/en/latest/markdown/podman-healthcheck-run.1.html
- Podman systemd / Quadlet docs: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman compose docs: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Dockerfile `HEALTHCHECK` reference, used because Podman Containerfiles use Dockerfile syntax: https://docs.docker.com/reference/dockerfile
- Compose Specification: https://github.com/compose-spec/compose-spec/blob/main/spec.md
- PostgreSQL `pg_isready` docs: https://www.postgresql.org/docs/16/app-pg-isready.html
- npm CLI docs (`omit` for production installs): https://docs.npmjs.com/cli/v11/commands/npm-install/

## Issues Found
- The first Node.js Containerfile used `curl` in `HEALTHCHECK` without installing `curl`. I added `apk add --no-cache curl` so the example works in `node:20-alpine`.
- The Node.js examples used `npm ci --only=production`, while current npm documentation uses `--omit=dev` for production-only installs. I updated both examples to the current documented flag.
- The explanation for `curl -f` said it fails on any non-200 response. That was too broad. I corrected it to HTTP 4xx/5xx responses or connection failures.
- The PostgreSQL example checked `mydb` even though the example image did not create or guarantee that database. I changed it to `postgres` so the example is valid as written.
- The comment above `podman healthcheck run` said it watches health in real time. The Podman command runs the health check manually once. I corrected the wording.
- The compose section claimed `depends_on: condition: service_healthy` definitively guarantees startup ordering with Podman. Podman documents `podman compose` as a wrapper around an external compose provider, and the Compose spec notes that implementation support is optional. I changed the wording to make the provider and version dependency explicit.
- The systemd / Quadlet section implied `Restart=on-failure` alone would recover from an unhealthy container. Podman requires a health failure action for that path. I added `HealthOnFailure=kill` to the Quadlet example and changed the direct `podman run` example to `--health-on-failure=restart`.
- The description and conclusion implied `HEALTHCHECK` by itself enables automatic recovery. I corrected that to say recovery requires health-failure actions or service manager policies.

## Review Notes
- Core `HEALTHCHECK` syntax and the main timing options are valid. I verified the syntax against Podman build docs plus the Dockerfile reference that Podman explicitly follows.
- Podman was not installed in the local workspace, so CLI verification was done against official documentation rather than local `podman --help` output.
- The post still omits newer Dockerfile `--start-interval` syntax, but that omission is not an error, and Podman's runtime documentation focuses on `--health-start-period` and `--health-startup-*` options.

# Validation Summary: How to Manage Environment-Specific Configs with Docker Compose Profiles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Compose (profiles, overrides, secrets)
- Docker Compose YAML configuration
- PostgreSQL (postgres:16-alpine image)
- Bash wrapper scripting
- GitHub Actions (matrix strategy)
- OpenTelemetry Collector (referenced)

## Sources Consulted
- Docker Compose `profiles` documentation — https://docs.docker.com/compose/how-tos/profiles/
- Docker Compose environment variables (`COMPOSE_PROFILES`) — https://docs.docker.com/compose/how-tos/environment-variables/envvars/
- Docker Compose `secrets` top-level element — https://docs.docker.com/reference/compose-file/secrets/
- Docker Compose merge / override files — https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/
- Docker Compose `depends_on` (short syntax waits for start, not readiness) — https://docs.docker.com/reference/compose-file/services/#depends_on
- `docker compose up` CLI reference (`--exit-code-from`, `--abort-on-container-exit`) — https://docs.docker.com/reference/cli/docker/compose/up/
- GitHub Actions matrix strategy — https://docs.github.com/actions/using-jobs/using-a-matrix-for-your-jobs

## Issues Found
- **Incorrect `COMPOSE_PROFILES` separator in the CI matrix (Section 6).** The matrix used `profile: [core, core+async]`, which feeds `COMPOSE_PROFILES="core+async"`. `COMPOSE_PROFILES` is a **comma-separated** list per Docker's documentation, so `core+async` would be treated as a single profile literally named `core+async`, matching no service and silently enabling nothing. Changed the matrix entry to `"core,async"` (quoted YAML string) and added a clarifying comment so the combined-profile job actually enables both `core` and `async`.

## Review Notes
- Section 5 states the `observability` profile "spins up OpenTelemetry Collector + Jaeger locally," but the baseline Compose file only defines a single `observability` (otel-collector) service with no Jaeger service. This is a narrative aspiration rather than a technical error in the shown YAML, so it was left unchanged; a future revision could either add a Jaeger service or drop the Jaeger reference.
- The `compose.sh` wrapper hard-codes `--profile core`, so commands like `./compose.sh --profile async up` (Sections 5 and 7) expand to `docker compose --profile core --profile async up` — correct and consistent with repeatable `--profile` flags.
- With the corrected comma-separated `COMPOSE_PROFILES`, `docker compose` reads the variable natively, so `compose-ci.sh` does not strictly need to "parse" it; the existing wording remains accurate enough.
- All other code, commands, and configuration (file-based secrets at `/run/secrets/`, auto-merged `docker-compose.override.yaml`, `set -a` export pattern, `--exit-code-from`, `docker compose ls`, `down -v` volume removal) verified correct against current Docker documentation.

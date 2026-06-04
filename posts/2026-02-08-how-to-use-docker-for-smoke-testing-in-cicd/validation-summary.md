# Validation Summary: How to Use Docker for Smoke Testing in CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Bash
- curl
- Alpine Linux
- PostgreSQL
- Redis
- Python
- pytest
- requests
- GitHub Actions

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference, including `depends_on` and `service_healthy`: https://docs.docker.com/reference/compose-file/services/
- `docker compose up` CLI reference: https://docs.docker.com/reference/cli/docker/compose/up/
- `docker compose run` CLI reference: https://docs.docker.com/reference/cli/docker/compose/run/
- `docker run` / `docker container run` CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker networking documentation: https://docs.docker.com/network/
- Docker Compose networking documentation: https://docs.docker.com/compose/how-tos/networking/
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- PostgreSQL versioning policy: https://www.postgresql.org/support/versioning/
- pytest usage documentation for `--junitxml`: https://docs.pytest.org/en/stable/how-to/output.html
- GitHub Actions artifact documentation: https://docs.github.com/actions/using-workflows/storing-workflow-data-as-artifacts

## Issues Found
- The smoke test runner used `alpine:3.19`, whose normal support ended on 2025-11-01. Changed the base image to `alpine:3.23`, which is supported as of 2026-06-04.
- The Compose file included the obsolete top-level `version: "3.8"` field. Removed it because current Docker Compose uses the Compose Specification and treats `version` as informational only, emitting an obsolete warning.
- The image-before-push script could test the Compose `api` service instead of the newly built image because `docker compose run smoke-tests` would honor the `smoke-tests` dependency on `api`. Updated the script to start only PostgreSQL and Redis with `--wait`, run the newly built image on the Compose network, and run `smoke-tests` with `--no-deps` and `BASE_URL=http://smoke-test-app:3000`.
- The image-before-push script used a fragile inline network lookup and only cleaned up on the success path. Updated it to capture the Compose network name once and clean up the app container and Compose stack through an `EXIT` trap.

## Review Notes
- The Compose `api` healthcheck assumes the application image contains `curl`. If a real application image does not include `curl`, the healthcheck command should use a tool available in that image or be implemented inside the application.
- The performance smoke thresholds are syntactically valid but environment-dependent. In a real CI environment, they should be calibrated to the application and runner capacity.

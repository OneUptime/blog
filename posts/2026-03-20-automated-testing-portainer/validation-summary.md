# Validation Summary: How to Set Up Automated Testing with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer API
- Docker Compose
- Docker healthchecks and startup ordering
- Docker Engine API
- Python
- PostgreSQL
- Redis
- Playwright
- Bash

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference (`healthcheck`): https://docs.docker.com/reference/compose-file/services/
- Docker Compose startup ordering: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker Engine API reference: https://docs.docker.com/reference/api/engine/
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer OpenAPI spec: https://api-docs.portainer.io/versions/ee/2.39.2/openapi.yaml
- Portainer stacks schema: https://api-docs.portainer.io/versions/ee/2.39.2/stacks.yaml
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Playwright Docker docs: https://playwright.dev/docs/docker
- Playwright library/test package docs: https://playwright.dev/docs/library

## Issues Found
- Removed obsolete top-level `version: "3.8"` entries from the Compose examples. Current Docker Compose treats the `version` field as obsolete and only uses the Compose Specification.
- Fixed the integration test example to remove a broken dependency wait command. The original snippet imported `psycopg2` without declaring it and used an invalid connection loop. Since the example already uses `depends_on` with `condition: service_healthy`, the extra wait logic was unnecessary. I replaced it with a direct `pytest` command.
- Added the missing top-level `volumes` declaration for `test_results` in the integration test Compose example. Without that declaration, `docker compose config` rejects the file as an invalid project.
- Fixed the application healthcheck in the Playwright example. The original healthcheck used `curl`, but the sample Dockerfile is based on `python:3.12-slim`, which does not include `curl` by default. I replaced it with a Python-based HTTP check.
- Updated the Playwright container example to match current Playwright Docker guidance. The original image tag was outdated, and the official Playwright Docker image does not include the Playwright package itself. I updated the image version, installed `@playwright/test` explicitly with a matching version, enabled `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`, and added the recommended `init: true` and `ipc: host` settings.
- Updated the app-to-database startup dependency in the Playwright example to wait for the PostgreSQL healthcheck before starting the app container.
- Fixed the Portainer test runner command so test failures propagate correctly. The original `&& echo 'Tests PASSED' || echo 'Tests FAILED'` pattern causes the container to exit successfully even when `pytest` fails. I changed it to preserve and return the actual `pytest` exit code.
- Removed the fixed `container_name` from the on-demand Portainer test runner service. The original stack used dynamic stack names but a fixed container name, which creates name conflicts across repeated or concurrent runs.
- Reworked the Portainer API CI example to use documented request fields (`Name`, `StackFileContent`, `Env`) and Portainer’s Docker API proxy instead of local `docker inspect` and `docker cp`. The original script would only work if the CI runner had direct access to the same Docker daemon that Portainer was managing, which is not what the post described.

## Review Notes
- The tutorial is technically salvageable and is now accurate after the fixes above.
- The Playwright example now works with the official Docker image, but a dedicated test image or a checked-in `package.json` would be cleaner for long-term maintenance.

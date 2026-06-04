# Validation Summary: How to Run Saleor in Docker for E-Commerce

## Status
validated

## Post Type
Tutorial / Docker setup guide

## Technologies Covered
- Saleor
- Docker
- Docker Compose
- PostgreSQL
- Valkey
- Celery
- GraphQL / GraphiQL
- Jaeger
- Mailpit
- Python / Django

## Sources Consulted
- Saleor Platform README: https://github.com/saleor/saleor-platform
- Saleor Platform Docker Compose file: https://github.com/saleor/saleor-platform/blob/main/docker-compose.yml
- Saleor Platform backend environment file: https://github.com/saleor/saleor-platform/blob/main/backend.env
- Saleor Platform common environment file: https://github.com/saleor/saleor-platform/blob/main/common.env
- Saleor Core repository README: https://github.com/saleor/saleor
- Saleor 3.23 GraphQL schema: https://github.com/saleor/saleor/blob/3.23/saleor/graphql/schema.graphql
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Jaeger Docker image documentation: https://www.jaegertracing.io/docs/latest/getting-started/

## Issues Found
- The post claimed the Saleor Platform repository includes submodules for core, dashboard, and storefront. The current official platform workflow does not require a submodule initialization step, and the platform README lists Core GraphQL API, Dashboard, Mailpit, Jaeger, and supporting database/cache services. Removed the submodule command and storefront references.
- The Docker Compose example used floating `latest` Saleor images. The current official platform Compose file pins Saleor and Dashboard images to `3.23`. Updated both image tags to `3.23`.
- The Compose example used Redis as a `redis` service with `REDIS_URL`. The current official platform uses a `cache` service based on `valkey/valkey:8.1-alpine` and configures Saleor with `CACHE_URL` plus `CELERY_BROKER_URL`. Updated the service, environment variables, cache command, and related wording.
- The Compose example used PostgreSQL 16 and custom credentials that did not match the official platform environment. Updated the database service to PostgreSQL 15 Alpine and aligned credentials with the current `DATABASE_URL`.
- The Compose example used the legacy Jaeger all-in-one image and `JAEGER_AGENT_HOST`. The current official setup uses `jaegertracing/jaeger` with OTLP ports `4317` and `4318`, and Saleor is configured through OpenTelemetry environment variables. Updated the image, ports, and environment variables.
- The Dashboard URL was listed as `http://localhost:9002`, but the official platform exposes Dashboard on `http://localhost:9000`. Updated the Compose port mapping and service table.
- The post described the `/graphql/` UI as GraphQL Playground. Saleor switched to GraphiQL in the 3.x series, so the wording now says GraphiQL.
- The migration and sample-data commands used `docker compose exec` after starting the stack. The official platform README uses one-off `docker compose run --rm api python3 manage.py ...` commands before running the full application. Updated the commands accordingly.
- The Compose snippet included a top-level `version: "3.8"` key. Modern Docker Compose no longer requires it, and the official platform Compose file omits it. Removed the version key.

## Review Notes
The corrected Compose block was checked with `docker compose config --quiet`. The GraphQL product query and `checkoutCreate` mutation fields were checked against the Saleor 3.23 schema. This setup is for local development, matching the official Saleor Platform guidance, and should not be presented as a production deployment.

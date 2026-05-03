# Validation Summary: How to Deploy Hasura GraphQL Engine via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Hasura GraphQL Engine (v2.40.0)
- Portainer (stack deployment)
- Docker / Docker Compose
- PostgreSQL (postgres:16-alpine)
- GraphQL (queries, mutations, subscriptions)
- Hasura CLI
- JWT authentication

## Sources Consulted
- Hasura GraphQL Engine docs — server configuration / environment variables: https://hasura.io/docs/2.0/deployment/graphql-engine-flags/reference/
- Hasura JWT auth docs (HASURA_GRAPHQL_JWT_SECRET format): https://hasura.io/docs/2.0/auth/authentication/jwt/
- Hasura logging — enabled log types: https://hasura.io/docs/2.0/deployment/logging/
- Hasura CLI installation and metadata commands: https://hasura.io/docs/2.0/hasura-cli/install-hasura-cli/ and https://hasura.io/docs/2.0/hasura-cli/commands/hasura_metadata_apply/
- Hasura permissions / session variables (X-Hasura-User-Id): https://hasura.io/docs/2.0/auth/authorization/permission-rules/
- Hasura Docker image releases on Docker Hub: https://hub.docker.com/r/hasura/graphql-engine/tags (v2.40.0 confirmed)
- PostgreSQL 16 Alpine image on Docker Hub: https://hub.docker.com/_/postgres
- Docker Compose `depends_on` with `condition: service_healthy`: https://docs.docker.com/compose/compose-file/05-services/#depends_on

## Issues Found
No technical issues found.

- Hasura image tag `hasura/graphql-engine:v2.40.0` is a valid published release.
- All `HASURA_GRAPHQL_*` environment variables used are correct and current (DATABASE_URL, ENABLE_CONSOLE, DEV_MODE, ENABLED_LOG_TYPES, ADMIN_SECRET, JWT_SECRET).
- The enabled log types list (`startup,http-log,webhook-log,websocket-log,query-log`) matches the documented allowed values.
- `HASURA_GRAPHQL_JWT_SECRET` JSON shape `{"type":"HS256","key":"..."}` matches the documented HS256 configuration.
- GraphQL examples use correct Hasura conventions: auto-generated root fields (`users`, `insert_users_one`), `order_by`, `limit`, and subscription syntax.
- CLI install one-liner (`curl -L .../cli/get.sh | bash`) is the documented install method, and `hasura init`, `hasura metadata export`, `hasura metadata apply` are real commands with correct flags.
- Permission filter using `X-Hasura-User-Id` session variable matches the documented session-variable naming for permissions.
- Console path `/console` and admin secret access flow are correct.
- Compose file uses valid `depends_on` long-form syntax with `condition: service_healthy` and a working `pg_isready` healthcheck.

## Review Notes
- Hasura v2.x is in maintenance/feature-frozen mode as Hasura's primary investment has shifted to Hasura DDN (v3). v2.40.0 still receives security patches at the time of writing, but readers planning new long-term deployments may want to evaluate Hasura DDN. This is informational only and not a correctness issue with the post.
- The post enables the console (`HASURA_GRAPHQL_ENABLE_CONSOLE=true`) for the demo and correctly recommends disabling it (along with `HASURA_GRAPHQL_DEV_MODE`) for production deployments in the conclusion.
- The Postgres container is exposed only on the internal `hasura_net` bridge network (no host port published), which is good practice and matches the example.
- For real production use, secrets should be stored in Portainer's stack environment / secret store rather than committed; the post already implies this by using `${...}` interpolation.

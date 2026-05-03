# Validation Summary: How to Deploy Hasura GraphQL Engine via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Hasura GraphQL Engine (v2.38.0)
- Portainer (Docker stack deployment)
- Docker Compose (v3.8)
- PostgreSQL 16 (postgres:16-alpine)
- GraphQL (queries, mutations, subscriptions)
- JWT authentication (RS256 with JWKS)
- Hasura row-level permissions
- Hasura REST endpoints

## Sources Consulted
- Hasura GraphQL Engine reference: https://hasura.io/docs/2.0/deployment/graphql-engine-flags/reference/
- Hasura JWT authentication docs: https://hasura.io/docs/2.0/auth/authentication/jwt/
- Hasura mutations (insert_*_one): https://hasura.io/docs/2.0/mutations/postgres/insert/
- Hasura subscriptions docs: https://hasura.io/docs/2.0/subscriptions/postgres/index/
- Hasura REST endpoints docs: https://hasura.io/docs/2.0/restified/overview/
- Docker Hub: hasura/graphql-engine image tags
- PostgreSQL Docker official image (postgres:16-alpine)
- Docker Compose specification (depends_on with condition: service_healthy)

## Issues Found
No technical issues found.

All checked items are accurate:
- `hasura/graphql-engine:v2.38.0` is a real, published image tag.
- All listed environment variables (`HASURA_GRAPHQL_DATABASE_URL`, `HASURA_GRAPHQL_ENABLE_CONSOLE`, `HASURA_GRAPHQL_ADMIN_SECRET`, `HASURA_GRAPHQL_JWT_SECRET`, `HASURA_GRAPHQL_DEV_MODE`, `HASURA_GRAPHQL_ENABLED_LOG_TYPES`) exist and accept the values shown.
- The JWT secret JSON form (`{"type":"RS256","jwk_url":"..."}`) is a supported configuration for asymmetric keys with JWKS.
- The Compose file's `depends_on` with `condition: service_healthy` and the `pg_isready` healthcheck are valid.
- GraphQL examples use correct Hasura conventions: `#` for comments, `insert_<table>_one` mutation, `_eq` operator, `where`/`order_by`/`limit` arguments, and subscription syntax.
- Console tabs (Data, GraphiQL, Events, Remote Schemas, REST) match the actual Hasura console.
- The REST endpoint URL pattern (`/api/rest/<endpoint-name>`) and JWT `Authorization: Bearer` header usage are correct.

## Review Notes
- Hasura v2.38.0 is a valid release but not the latest in the v2.x line; readers wanting the most current release should consult the Hasura releases page. This is acceptable as the post pins a specific version for reproducibility.
- The JSON snippet in the "Row-Level Security" section uses a `//` comment, which is JSONC-style (not strict JSON). It is clearly illustrative rather than a literal Hasura metadata blob — the actual permission objects in Hasura metadata have a slightly different shape — so this is fine as a conceptual example.
- `HASURA_GRAPHQL_DEV_MODE: "false"` is the safe default; the inline comment "Development-only settings" applies more naturally to the log types list above it than to dev mode being false, but this is a stylistic nit and not a technical error.
- For production, the post correctly hints that the console should be disabled or protected; readers should treat `HASURA_GRAPHQL_ENABLE_CONSOLE: "true"` as suitable for development environments only.

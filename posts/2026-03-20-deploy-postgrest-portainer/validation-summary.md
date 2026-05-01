# Validation Summary: How to Deploy PostgREST via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Compose
- Docker
- PostgREST
- PostgreSQL
- JSON Web Token (JWT)
- `curl`
- Python 3

## Sources Consulted
- PostgREST Configuration v12.2: https://docs.postgrest.org/en/v12/references/configuration.html
- PostgREST Authentication v12.2: https://docs.postgrest.org/en/v12/references/auth.html
- PostgREST Tables and Views v12.2: https://docs.postgrest.org/en/v12/references/api/tables_views.html
- PostgREST OpenAPI v12.2: https://docs.postgrest.org/en/v12/references/api/openapi.html
- PostgREST Tutorial 0 v12.2: https://docs.postgrest.org/en/v12/tutorials/tut0.html
- Portainer Add a new stack: https://docs.portainer.io/user/docker/stacks/add
- Portainer Relative Path Support: https://docs.portainer.io/advanced/relative-paths
- Docker Compose startup order: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- PostgreSQL `CREATE ROLE`: https://www.postgresql.org/docs/15/sql-createrole.html
- RFC 7519: JSON Web Token (JWT): https://www.rfc-editor.org/rfc/rfc7519
- RFC 7515: JSON Web Signature (JWS): https://www.rfc-editor.org/rfc/rfc7515

## Issues Found
- The Compose snippet used a top-level `version: "3.8"` field. I removed it because current Docker Compose treats `version` as obsolete and only keeps it for backward compatibility.
- The PostgreSQL service mounted `./init.sql`, which is not a safe generic Portainer stack instruction. Portainer documents relative path volume support only for Git-based deployments with the Business Edition feature enabled, so I changed the mount to `/opt/postgrest/init.sql` and updated the step text to make the host path explicit.
- The JWT secret example was inconsistent and too short. PostgREST documents a minimum `jwt-secret` length of 32 characters, so I replaced it with a single 32+ character example and used that same value consistently in the request example.
- The original JWT generation command depended on the third-party `jwt` Python module and used `eval(...)`. I replaced it with a dependency-free Python standard library example that generates a valid HS256 JWT using the configured secret.
- The conclusion said authorization is handled via PostgreSQL roles and RLS policies. I corrected this to PostgreSQL roles, object privileges, and optional RLS, which is the more accurate description of PostgREST's authorization model.

## Review Notes
- The post pins `postgrest/postgrest:v12.0.2`. I checked the examples against the current PostgREST v12 documentation, and the configuration and API behavior used here remain compatible within v12.
- PostgREST's OpenAPI document at `/` is permission-scoped by default, so the anonymous output reflects what the `anon` role can access unless `openapi-mode=ignore-privileges` is configured.
- The initialization SQL under `/docker-entrypoint-initdb.d/` runs only when PostgreSQL initializes a fresh data directory. Reusing the existing `postgres_data` volume will not rerun `init.sql`.
- Docker was not available in the review workspace, so I could not run `docker compose config` locally. The Compose review was documentation-based, and the replacement JWT-generation snippet was executed locally to confirm it runs.

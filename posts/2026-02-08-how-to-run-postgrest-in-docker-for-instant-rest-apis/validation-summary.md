# Validation Summary: How to Run PostgREST in Docker for Instant REST APIs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- PostgREST
- PostgreSQL
- SQL
- REST APIs
- JWT authentication
- PostgreSQL row-level security
- Swagger UI
- OpenAPI
- curl

## Sources Consulted
- PostgREST 12.2 configuration documentation: https://docs.postgrest.org/en/v12/references/configuration.html
- PostgREST 12.2 tables and views API documentation: https://docs.postgrest.org/en/v12/references/api/tables_views.html
- PostgREST 12.2 functions as RPC documentation: https://docs.postgrest.org/en/v12/references/api/functions.html
- PostgREST 12.2 Prefer header documentation: https://docs.postgrest.org/en/v12/references/api/preferences.html
- PostgREST 12.2 pagination and count documentation: https://docs.postgrest.org/en/v12/references/api/pagination_count.html
- PostgREST 12.2 authentication documentation: https://docs.postgrest.org/en/v12/references/auth.html
- PostgREST 12.2 OpenAPI documentation: https://docs.postgrest.org/en/v12/references/api/openapi.html
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose service dependency documentation: https://docs.docker.com/reference/compose-file/services/
- Swagger UI Docker installation documentation: https://swagger.io/docs/open-source-tools/swagger-ui/usage/installation/
- Swagger UI configuration documentation: https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/
- PostgreSQL 16 CREATE POLICY documentation: https://www.postgresql.org/docs/16/sql-createpolicy.html
- PostgreSQL 17 row security policies documentation: https://www.postgresql.org/docs/17/ddl-rowsecurity.html

## Issues Found
- The Docker Compose example used the obsolete top-level `version: "3.8"` field. Removed it because the current Compose Specification treats `version` as only informative and Docker Compose warns that it is obsolete.
- The Swagger UI service used `API_URL`, which is not the documented Docker environment variable in current Swagger UI documentation. Changed it to `SWAGGER_JSON_URL` so the container loads PostgREST's generated OpenAPI document.
- The initialization SQL granted only `SELECT` and `INSERT` on `api.todos`, but later examples PATCH and DELETE `todos`. Updated the grant to include `UPDATE` and `DELETE` so the examples work with the anonymous role.
- The row-level security comments claimed users could only access their own todos, but the table has no owner column and the policies used `USING (TRUE)`. Reworded the text and comments to state that these example policies allow access for the listed roles and that real ownership checks should replace `TRUE` in production.

## Review Notes
- The PostgREST examples for filters, ordering, pagination, RPC calls, `Prefer: return=representation`, JWT bearer headers, and OpenAPI generation match the PostgREST 12 documentation.
- The tutorial uses the PostgreSQL superuser in `PGRST_DB_URI`, which is acceptable for a local demonstration but should be replaced with a dedicated authenticator role for production deployments.

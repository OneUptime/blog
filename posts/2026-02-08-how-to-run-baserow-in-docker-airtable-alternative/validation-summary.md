# Validation Summary: How to Run Baserow in Docker (Airtable Alternative)

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Baserow
- Docker
- Docker Compose
- PostgreSQL
- Redis
- Baserow REST API
- Baserow webhooks
- Traefik

## Sources Consulted
- Baserow Install with Docker: https://baserow.io/docs/installation%2Finstall-with-docker
- Baserow Install with Docker Compose: https://baserow.io/docs/installation%2Finstall-with-docker-compose
- Baserow Configuration: https://baserow.io/docs/installation%2Fconfiguration
- Baserow official docker-compose.yml: https://raw.githubusercontent.com/baserow/baserow/master/docker-compose.yml
- Baserow REST API guide: https://baserow.io/docs/apis%2Frest-api
- Baserow OpenAPI schema: https://api.baserow.io/api/schema.json
- Baserow webhooks user documentation: https://baserow.io/user-docs/webhooks
- Baserow field overview: https://baserow.io/user-docs/baserow-field-overview
- Baserow formula documentation: https://baserow.io/docs/tutorials/understanding-baserow-formulas
- Baserow formula reference: https://baserow.io/user-docs/understanding-formulas
- Baserow permissions overview: https://baserow.io/user-docs/permissions-overview
- Baserow role capabilities: https://baserow.io/user-docs/set-permission-level
- Docker Compose documentation: https://docs.docker.com/compose/
- PostgreSQL pg_dump documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL psql documentation: https://www.postgresql.org/docs/current/app-psql.html
- Redis Docker image documentation: https://hub.docker.com/_/redis
- Traefik Docker provider documentation: https://doc.traefik.io/traefik/providers/docker/

## Issues Found
- The production Docker Compose description said it used separate Baserow web frontend, API backend, and Celery worker containers, but the snippet used the all-in-one `baserow/baserow` image. Updated the wording to accurately describe an all-in-one Baserow container with external PostgreSQL and Redis, and pointed readers to the official standalone-image Compose setup for horizontal scaling.
- The introductory Docker image description omitted Redis from the all-in-one image. Added Redis to match Baserow's official Docker documentation.
- The Compose example used `BASEROW_DISABLE_ANONYMOUS_TELEMETRY`, which is not listed in Baserow's current configuration reference. Removed the unsupported environment variable.
- The webhook API example used database-token authentication and omitted required request fields. Updated it to use `Authorization: JWT`, added the required `name`, and removed the redundant `table_id` body field because the table ID is already supplied in the URL.
- The workspace invitation API example used an outdated endpoint and database-token authentication. Updated it to the current `/api/workspaces/invitations/workspace/WORKSPACE_ID/` endpoint, switched to JWT authentication, and added the required `base_url` field.

## Review Notes
The row CRUD examples using database-token authentication and `user_field_names=true` match the current Baserow OpenAPI schema. The quick-start Docker command is consistent with the official all-in-one image pattern, though pinning a specific Baserow image tag would be preferable for production change control.

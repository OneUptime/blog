# Validation Summary: How to Deploy NocoDB via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NocoDB
- Portainer
- Docker Compose
- PostgreSQL
- REST APIs

## Sources Consulted
- NocoDB official repository README: https://github.com/nocodb/nocodb/blob/develop/README.md
- NocoDB official PostgreSQL Docker Compose example: https://github.com/nocodb/nocodb/blob/develop/docker-compose/2_pg/docker-compose.yml
- NocoDB REST APIs overview: https://nocodb.com/docs/product-docs/developer-resources/rest-apis
- NocoDB API tokens documentation: https://nocodb.com/docs/product-docs/account-settings/api-tokens
- NocoDB data source connection documentation: https://nocodb.com/docs/product-docs/data-sources/connect-to-data-source
- NocoDB upload and download documentation: https://nocodb.com/docs/product-docs/table-operations/download
- Portainer Add a new stack documentation: https://docs.portainer.io/user/docker/stacks/add
- Docker Compose startup order documentation: https://docs.docker.com/compose/how-tos/startup-order/

## Issues Found
- The post pinned `nocodb/nocodb:0.209.3`, which is stale relative to current official self-hosting examples. I updated it to `nocodb/nocodb:latest` to match current upstream guidance.
- The access URL and external database workflow were outdated. I changed the initial access URL to `http://<host>:8080/dashboard` and updated the external data source steps to the current `Connect External Data` flow documented by NocoDB.
- The REST API examples used legacy `v1` paths, used `project-id`/table-name-style placeholders, and sent API tokens with `xc-auth`. Current NocoDB docs use `xc-token` (or `Authorization: Bearer`) for API tokens and current data APIs are documented under `v3`, so I updated the examples to `/api/v3/data/{base-id}/{table-id}/records` and corrected the request body shape for record creation.
- The CSV export example pointed to a direct table export endpoint that does not match current documented behavior. I replaced it with the current UI-based download flow documented by NocoDB.
- The conclusion incorrectly stated that `NC_AUTH_JWT_SECRET` secures API tokens. Official NocoDB documentation describes it as the JWT secret used for authentication and storing other secrets, so I corrected that wording.

## Review Notes
- Docker is not installed in this review environment, so I verified the Compose structure against Portainer, Docker, and NocoDB official documentation and upstream examples rather than executing `docker compose` locally.
- The compose file still publishes NocoDB directly on port `8080`; if this stack is later placed behind a reverse proxy, `NC_PUBLIC_URL` should be updated to the actual external URL exposed to users.

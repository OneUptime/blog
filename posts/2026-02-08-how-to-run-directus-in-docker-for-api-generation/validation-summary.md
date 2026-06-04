# Validation Summary: How to Run Directus in Docker for API Generation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Directus
- Docker
- Docker Compose
- PostgreSQL
- Redis
- SQLite
- REST API
- GraphQL
- WebSockets

## Sources Consulted
- Directus Docker Guide: https://docs.directus.io/self-hosted/docker-guide
- Directus Configuration Options: https://docs.directus.io/self-hosted/config-options
- Directus Collections API: https://directus.io/docs/api/collections
- Directus Fields API: https://directus.io/docs/api/fields
- Directus Items API: https://directus.io/docs/api/items
- Directus Files API: https://directus.io/docs/api/files
- Directus Authentication API: https://directus.io/docs/api/authentication
- Directus Policies API: https://directus.io/docs/api/policies
- Directus Permissions API: https://directus.io/docs/api/permissions
- Directus WebSocket Subscriptions Guide: https://docs.directus.io/guides/real-time/subscriptions/websockets
- Directus Breaking Changes: https://docs.directus.io/releases/breaking-changes
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Compose version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post used `directus/directus:10`, which is outdated for a current 2026 tutorial. Updated the Docker examples to use `directus/directus:11`, matching current Directus documentation.
- The Docker Compose example included the obsolete top-level `version: "3.8"` field. Removed it because current Docker Compose uses the Compose Specification and treats `version` as obsolete.
- The Redis cache example enabled caching but omitted `CACHE_AUTO_PURGE`. Added `CACHE_AUTO_PURGE: "true"` so cached API responses are automatically invalidated after data changes, matching Directus' recommended Redis cache example.
- The access-control example created a role and assigned permissions directly to `role`. Directus 11 introduced policy-based access control, so the example now creates a policy through `/policies` and assigns the permission to `policy`.

## Review Notes
The examples are suitable for a tutorial, but production deployments should use stronger secret handling, remove hard-coded credentials, configure `PUBLIC_URL`, and avoid exposing PostgreSQL on the host unless external database access is required.

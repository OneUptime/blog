# Validation Summary: How to Deploy Vikunja (Task Manager) via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Vikunja
- Docker Compose
- PostgreSQL
- REST API
- CalDAV

## Sources Consulted
- Vikunja Docker walkthrough: https://vikunja.io/docs/docker-walkthrough/
- Vikunja full Docker example: https://vikunja.io/docs/full-docker-example/
- Vikunja configuration options: https://vikunja.io/docs/config-options/
- Vikunja API documentation: https://vikunja.io/docs/api-documentation/
- Vikunja OpenAPI spec: https://try.vikunja.io/api/v1/docs.json
- Vikunja CalDAV help: https://vikunja.io/help/caldav/
- Vikunja install docs: https://vikunja.io/docs/installing/
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Docker Compose startup order docs: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose file reference for top-level `version`: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker volumes docs: https://docs.docker.com/engine/storage/volumes/
- Vikunja releases: https://github.com/go-vikunja/vikunja/releases

## Issues Found
- The Compose snippet pinned `vikunja/vikunja:0.23.0`, which is outdated relative to current Vikunja releases. I changed it to the official `vikunja/vikunja` image reference used in current Vikunja docs.
- The Compose snippet used `VIKUNJA_SERVICE_JWTSECRET`. Vikunja marks this setting as deprecated in favor of `VIKUNJA_SERVICE_SECRET`, so I updated the environment variable and the matching Portainer variable example.
- The Compose snippet used `VIKUNJA_SERVICE_FRONTENDURL`, but current Vikunja docs use `VIKUNJA_SERVICE_PUBLICURL` for the public-facing URL. I corrected the variable in the stack, the environment-variable example, the access instructions, and the conclusion.
- The post constructed the public URL from `VIKUNJA_DOMAIN` while later telling readers to open `http://<host>:3456`. Current Vikunja docs require the public URL to match the URL users actually open, especially when registering a user. I replaced that with a full `VIKUNJA_SERVICE_PUBLICURL` example and updated the access step accordingly.
- The REST API example created a project with `POST /api/v1/projects`, but the current OpenAPI spec defines project creation as `PUT /api/v1/projects`. I corrected the method.
- The REST API example listed tasks with `GET /api/v1/projects/1/tasks`, but the current OpenAPI spec lists project tasks through `GET /api/v1/projects/{id}/views/{view}/tasks`. I updated the example to fetch project views first, then list tasks through the view-aware endpoint.
- The CalDAV example suggested `/dav/` as the client server URL and named specific clients without support confirmation. Current Vikunja CalDAV docs say new clients should connect with `/dav/principals/<username>/` and may use a password, a dedicated CalDAV token, or an API token with the CalDAV permission group. I updated the example to match.
- The original Compose file used the top-level `version: "3.8"` field. Docker’s current Compose docs mark the top-level `version` key as obsolete, so I removed it.
- Vikunja’s current Docker docs explicitly call out writable file storage under `/app/vikunja/files` for uploads and backgrounds. The original post used a named volume without any host-permission guidance. I changed the example to a host path and added the required writable-directory prerequisite.

## Review Notes
- Vikunja’s current official release is `v2.3.0` as of April 9, 2026. Using the unpinned official image name keeps this Portainer guide aligned with the current docs, but it also means future deployments will pull newer Vikunja releases unless the image is pinned again.
- The login example is still valid for self-hosted Vikunja, but the official API docs now recommend API tokens as the preferred authentication method for automation.
- The CalDAV docs currently warn that the feature is still in an early alpha stage and client compatibility varies.

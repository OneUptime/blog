# Validation Summary: How to Access the Portainer API Documentation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- OpenAPI / Swagger
- REST API
- `curl`
- `jq`
- OpenAPI Generator

## Sources Consulted
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer API access guide: https://docs.portainer.io/2.21/api/access
- Portainer "Add an environment via the Portainer API" guide: https://docs.portainer.io/admin/environments/add/api
- Portainer hosted API reference: https://api-docs.portainer.io/
- Portainer CE versions index used by the hosted API reference: https://api-docs.portainer.io/ce-versions.json
- Portainer CE 2.39.2 OpenAPI document: https://api-docs.portainer.io/versions/ce/2.39.2/openapi.yaml
- Portainer source OpenAPI definition: https://raw.githubusercontent.com/portainer/portainer/master/api/swagger.yaml
- Portainer source for `/system/status`: https://github.com/portainer/portainer/blob/develop/api/http/handler/system/status.go

## Issues Found
- The post pointed readers to a built-in Swagger UI at `/api/documentation`. Current official Portainer documentation points readers to `https://docs.portainer.io/api/docs` and the versioned hosted reference at `https://api-docs.portainer.io/`, so the outdated built-in path was removed and replaced.
- The post linked to SwaggerHub as the latest official online documentation. Current official Portainer docs now use `api-docs.portainer.io`, so the obsolete SwaggerHub link was replaced with the supported hosted reference URL.
- The "Swagger UI" section implied the current official docs are an interactive Swagger UI. The wording was corrected to describe the current versioned API reference and its tag-based organization.
- The authentication section told readers to use Swagger UI's **Authorize** flow. Because the current official hosted docs are not presented that way, the section was corrected to show the supported JWT retrieval flow and the required `Authorization: Bearer <token>` header instead.
- The quick-reference entry for `POST /api/stacks` was incomplete. Current Portainer API docs require `type`, `method`, and `endpointId` query parameters, so the endpoint reference was updated to include them.
- The post claimed the raw spec could be downloaded from `/api/documentation/swagger.json`. Current official Portainer API docs publish versioned OpenAPI files from `api-docs.portainer.io`, so the download example was replaced with a version-aware command that resolves the correct hosted spec file.
- The version-check command was updated to use the current `/api/system/status` endpoint format with a generic HTTPS host placeholder and `jq -r` for the returned version string.

## Review Notes
- The official Portainer API access guide currently emphasizes per-user access tokens sent via `X-API-Key`, while the published OpenAPI document still describes JWT bearer authentication via `/api/auth`. The revised post keeps the JWT flow because it is still documented in Portainer's official OpenAPI reference and source spec.
- As of 2026-05-07, the hosted Portainer CE API reference marked `2.39.2` as the latest CE documentation version in `ce-versions.json`.

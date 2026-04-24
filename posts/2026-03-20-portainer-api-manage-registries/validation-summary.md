# Validation Summary: How to Manage Registries via the Portainer API - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- Docker and OCI image registries
- Docker Hub
- Azure Container Registry (ACR)
- GitHub Container Registry (GHCR)
- AWS ECR
- Bash
- `curl`
- `jq`

## Sources Consulted
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer BE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ee/2.39.1.yaml
- Portainer registry overview: https://docs.portainer.io/admin/registries
- Portainer "Add a new registry" documentation: https://docs.portainer.io/admin/registries/add
- Portainer Docker Hub registry documentation: https://docs.portainer.io/admin/registries/add/dockerhub
- Portainer Azure registry documentation: https://docs.portainer.io/admin/registries/add/azure
- Portainer GitHub registry documentation: https://docs.portainer.io/admin/registries/add/ghcr
- Portainer registry browsing documentation: https://docs.portainer.io/admin/registries/browse
- Portainer source: registry type enum in `api/portainer.go`: https://raw.githubusercontent.com/portainer/portainer/develop/api/portainer.go
- Portainer source: registry create handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/registries/registry_create.go
- Portainer source: registry update handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/registries/registry_update.go
- Portainer source: registry ping handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/registries/registry_ping.go
- Portainer source: registry handler field scrubbing and routing: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/registries/handler.go
- Portainer source: auth handler: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/auth/authenticate.go
- Portainer source: Docker Hub migration and matching logic: https://raw.githubusercontent.com/portainer/portainer/develop/api/datastore/migrator/migrate_dbversion31.go
- Portainer source: Docker Hub registry matching tests: https://raw.githubusercontent.com/portainer/portainer/develop/api/docker/images/registry_test.go

## Issues Found
- The registry type table was incorrect. The post mapped provider values to the wrong numeric `Type` constants. Updated the table to match the current Portainer enum values from the published OpenAPI spec and Portainer source (`1=Quay`, `2=Azure`, `3=Custom`, `4=GitLab`, `5=ProGet`, `6=DockerHub`, `7=ECR`, `8=GitHub` in BE).
- The examples treated JWTs and API access tokens as interchangeable in the same header. Portainer documents API access tokens in the `X-API-Key` header, while JWTs use `Authorization: Bearer ...`. Updated the setup snippet to show the correct header for each auth method.
- The custom registry example used the wrong registry type. Changed the generic/private registry example from `Type: 6` to `Type: 3`.
- The Docker Hub example used the wrong provider type and a nonstandard URL. Updated it from `Type: 1` and `https://index.docker.io` to `Type: 6` and `docker.io`, matching Portainer’s current registry type definitions and Docker Hub handling in the Portainer source.
- The GHCR example was incorrect in multiple ways. GitHub registry support is documented as Business Edition only, the provider type is `8` rather than `7`, and the create payload needs GitHub-specific metadata. Updated the step to mark it BE-only, changed the type to `8`, and added the `Github` object.
- The Azure ACR example used the wrong provider type. Updated it from `Type: 4` to `Type: 2`.
- The repository and tag listing example could not be validated against the current published Portainer API. The current public OpenAPI spec documents create/list/inspect/update/delete, configure, ping, and tag-deletion operations, but not the GET repository/tag listing endpoints used in the post. Replaced that section with the documented `/api/registries/ping` endpoint.
- The automation script repeated the wrong registry type values and did not include the required GitHub metadata for GHCR. It also used lowercase `/api/auth` JSON field names instead of the published schema casing. Updated the script accordingly and made the response parsing safer with `printf '%s\n'`.

## Review Notes
- Portainer’s registry browsing UI is documented as a Business Edition feature. The current public BE OpenAPI spec documents registry management and tag deletion operations, but it does not currently publish the GET repository/tag listing examples that the original post used.
- The published OpenAPI spec advertises both `Authorization` and `X-API-KEY` security schemes. The separate Portainer API access documentation is the authoritative source for using API access tokens via `X-API-Key`.
- Local checks: `validation.json` was validated with `jq`, and the embedded Bash automation script was extracted and passed `bash -n`. Runtime validation against a live Portainer instance was not possible in this workspace.

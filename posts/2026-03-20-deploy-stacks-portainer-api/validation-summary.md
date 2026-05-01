# Validation Summary: How to Deploy Stacks via the Portainer API

## Status
validated

## Post Type
Guide / API tutorial

## Technologies Covered
- Portainer REST API
- Docker Compose stacks
- Bash
- `curl`
- `jq`
- Git repository-based deployments
- CI/CD automation

## Sources Consulted
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI specification: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer documentation, "Accessing the Portainer API": https://docs.portainer.io/2.27/api/access
- Portainer release notes covering `/stacks` API field changes such as `ComposeFile`: https://docs.portainer.io/2.33-lts/release-notes

## Issues Found
- The post authenticated access tokens with `Authorization: Bearer ...`, but Portainer documents personal access tokens via the `X-API-Key` header. Updated all examples to use `X-API-Key`.
- The "Type Value" table was inaccurate for the current API shape. The current standalone stack creation API uses separate endpoints (`/stacks/create/standalone/string`, `/file`, `/repository`) rather than method values `1`, `2`, and `3`. Updated the table accordingly.
- The update examples used `PullImage`, which the current OpenAPI spec marks deprecated since 2.36. Replaced it with `RepullImageAndRedeploy`.
- The `start` and `stop` examples omitted the required `endpointId` query parameter. Added `?endpointId=${ENDPOINT_ID}` to both calls.
- The update section implied `PUT /api/stacks/{id}` was a generic stack update endpoint. Portainer documents it as applying only to file-based stacks. Clarified that the section and CI/CD example are for file-based stacks.
- The stack lookup examples queried `/api/stacks` without scoping to an environment. Updated them to use the documented `filters` query parameter with `EndpointID` so the lookup matches the selected environment.

## Review Notes
- `PUT /api/stacks/{id}` is for file-based stacks. Git-backed stacks use the Git-specific stack endpoints such as `/api/stacks/{id}/git` and `/api/stacks/{id}/git/redeploy`.
- The post still references file-upload deployment in the overview table but does not include a file-upload code example. This is not technically incorrect, but adding one later would make coverage more complete.

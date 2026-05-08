# Validation Summary: How to Automate Image Updates via Portainer API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer REST API
- Docker Engine API
- Docker Compose stack files
- GitHub Actions
- Watchtower
- curl, jq, and sed

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API access token documentation: https://docs.portainer.io/2.21/api/access
- Portainer CE 2.39.2 OpenAPI schema: https://api-docs.portainer.io/versions/ce/2.39.2/openapi.yaml
- Portainer CE 2.39.2 stacks API schema: https://api-docs.portainer.io/versions/ce/2.39.2/stacks.yaml
- Docker Engine API v1.54 image create endpoint: https://docs.docker.com/reference/api/engine/version/v1.54/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Watchtower arguments documentation: https://containrrr.dev/watchtower/arguments/
- Watchtower container selection documentation: https://containrrr.dev/watchtower/container-selection/

## Issues Found
- The Portainer access token examples used `Authorization: Bearer $TOKEN`. Portainer's access token documentation uses the `X-API-Key` header for API access tokens, and the current OpenAPI schema supports `ApiKeyAuth` with `X-API-KEY`. Updated all access-token examples to use `X-API-Key`.
- The CI/CD diagram showed `POST /stacks/{id}/git/redeploy`, but the Git redeploy endpoint is `PUT` and applies to Git-backed stacks. The article's command examples update file-based stacks, so the diagram was changed to `PUT /stacks/{id}?endpointId={endpointId}`.
- The examples used `PullImage`, which Portainer marks deprecated since 2.36 in favor of `RepullImageAndRedeploy`. Updated the stack update payloads to use `RepullImageAndRedeploy`.
- The GitHub Actions example fetched stack details from `/api/stacks/5` and then read `.StackFileContent`. The current API exposes stack file content through `/api/stacks/{id}/file`, so the example now calls `/api/stacks/5/file`.
- The GitHub Actions YAML was shown as if it were a deploy workflow file but began directly with a `deploy` key. Updated the snippet to show the deploy job under `jobs:` and clarified that it belongs in an existing workflow with a `build` job.

## Review Notes
The Portainer stack update endpoint is documented for file-based stacks. Git-backed stacks should use the Git redeploy endpoint instead. Watchtower's label filtering, cleanup, and poll interval settings are consistent with the Watchtower documentation; note that the upstream Watchtower GitHub repository is currently archived, so future posts may want to mention maintenance status when recommending it.

# Validation Summary: How to Build a Self-Service Developer Portal with Portainer API - Self Service

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Portainer REST API
- Docker Compose stacks
- Python requests
- GitHub Actions
- Mermaid architecture diagrams

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer CE 2.40.0 OpenAPI specification: https://api-docs.portainer.io/versions/ce/2.40.0.yaml
- Docker Compose `ports` reference: https://docs.docker.com/reference/compose-file/services/#ports
- Docker Compose `version` top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/#version-top-level-element-obsolete
- GitHub Actions pull request event documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request

## Issues Found
- The Portainer stack creation example used the older generic `POST /api/stacks?type=2&method=string&endpointId=...` form. Updated it to the current `POST /api/stacks/create/standalone/string?endpointId=...` endpoint documented in the current Portainer OpenAPI spec.
- The Portainer authentication header used a bearer token variable for all calls. Updated the sample to use `PORTAINER_API_KEY` with the documented `X-API-Key` header for API access tokens.
- The generated Compose file used the obsolete top-level `version: "3.8"` field. Removed it because current Compose treats `version` as informational and obsolete.
- The Compose port mapping used `"0:8080"` for dynamic port assignment. Updated it to `"8080"`, which is the documented short syntax for allowing the runtime to assign an available host port.
- The list endpoint accepted `requester` but did not actually filter by requester. Added Portainer stack environment metadata during creation and filtered returned stacks by `PREVIEW_REQUESTER`.
- The list and delete Python examples did not check HTTP error responses. Added `raise_for_status()` calls so failures are surfaced instead of silently ignored.
- The GitHub Actions create request omitted `Content-Type: application/json`, and the delete request omitted the portal authorization header. Added both headers where needed.
- The GitHub Actions preview tag used `github.sha`, which is the pull request merge commit SHA for `pull_request` workflows. Updated it to `github.event.pull_request.head.sha` for the PR head commit.
- The GitHub Actions teardown request placed the raw branch name in the URL path. Added URL encoding before using the branch name as a path segment so branch names containing `/` do not break the request path.

## Review Notes
The corrected Portainer example targets standalone Docker Compose stacks. Swarm deployments use the separate `/api/stacks/create/swarm/string` endpoint and require `SwarmID`.

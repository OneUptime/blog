# Validation Summary: How to Generate API Access Tokens in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- REST API authentication
- Bash
- `curl`
- GitHub Actions
- JSON

## Sources Consulted
- Portainer Documentation, Accessing the Portainer API: https://docs.portainer.io/api/access
- Portainer Documentation, API documentation: https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 API documentation: https://api-docs.portainer.io/?edition=ce&version=2.39.1
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer Documentation, Authentication settings: https://docs.portainer.io/admin/settings/authentication
- Portainer source, user access token handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_create_access_token.go
- Portainer source, API key prefix implementation: https://github.com/portainer/portainer/blob/develop/api/apikey/service.go
- Portainer source, stack update handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/stacks/stack_update.go

## Issues Found
- The post used `/api/users/me/tokens` for token creation, listing, and revocation. In the current Portainer CE 2.39.1 API, token management uses `/api/users/{id}/tokens` and `/api/users/{id}/tokens/{keyID}`. I updated the examples to fetch the current user ID from `/api/users/me` first, then call the correct token endpoints.
- The API token creation example omitted the required `password` field. Portainer CE 2.39.1 requires both `description` and `password` in the token creation payload for internally authenticated users. I added the missing field.
- The Web UI steps omitted the required password confirmation when creating an access token. I added that step to match the documented flow.
- The direct stack deployment example used `POST /api/stacks` with lowercase JSON fields (`name`, `swarmID`, `stackFileContent`). In the current API, text-based standalone stack creation uses `POST /api/stacks/create/standalone/string?endpointId=...` and the payload fields are `Name` and `StackFileContent`. I corrected the endpoint and payload.
- The GitHub Actions example used the wrong request field casing (`stackFileContent`) for stack updates. The current API expects `StackFileContent`. I fixed the payload casing.
- The GitHub Actions example looked up stacks only by name and could select the wrong stack if multiple environments had the same name. I updated the lookup to also match `EndpointId` and added a failure check when the stack is missing.
- The sample token response used outdated field names (`userID`) and an incorrect `lastUsed` string shape. I corrected the example response to the current field naming used by the API.

## Review Notes
- Verified against Portainer CE 2.39.1, which was the current LTS API documentation available on April 24, 2026.
- The default JWT session lifetime of 8 hours is correct, but it is configurable in Portainer authentication settings.
- Portainer documents the API key header as `X-API-KEY`. HTTP header names are case-insensitive, so the post's `X-API-Key` examples remain valid.
- Stack updates via `PUT /api/stacks/{id}` apply to file-based stacks. Git-based stacks use the dedicated Git stack endpoints.

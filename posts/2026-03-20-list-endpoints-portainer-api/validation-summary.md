# Validation Summary: How to List All Endpoints via the Portainer API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- REST API
- Bash
- `curl`
- `jq`
- JSON

## Sources Consulted
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer CE 2.39.1 OpenAPI specification: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer API docs landing page: https://docs.portainer.io/api/docs
- Portainer source for `/endpoints` list handling: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/endpoints/endpoint_list.go
- Portainer source for `/stacks` list filter handling: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/stacks/stack_list.go

## Issues Found
- The post used `Authorization: Bearer ${API_TOKEN}` while naming the credential an API token. Current Portainer docs show user-generated API access tokens being sent in the `X-API-Key` header, so the examples were updated to use `X-API-Key: ${API_TOKEN}` consistently.
- The endpoint type table was outdated and mismapped several values. It was corrected to match the current Portainer CE 2.39.1 OpenAPI enum for environment types.
- The Kubernetes filtering example only matched types `5` and `7`, which would miss agent-connected Kubernetes environments (`Type == 6`). The filter was updated to include `5`, `6`, and `7`.
- The sample response showed `production-k8s` as `Type: 7`, which corresponds to an edge-agent Kubernetes environment in the current API, not a direct Kubernetes API environment. The example was corrected to `Type: 5`.
- The sample response used the deprecated `Tags` field. It was updated to `TagIds`, which is the current field in the published schema.
- The sentence claiming that most or all subsequent Portainer API calls require an endpoint ID was too broad. It was narrowed to “many” and to “subsequent environment-specific calls.”

## Review Notes
- Portainer currently supports both JWT-based auth via `Authorization: Bearer <token>` and personal API access tokens via `X-API-Key`. This post now uses the API access token flow consistently.
- The pagination example is valid as written. Portainer’s current handler treats `start=1` as the first item/page offset, not the second.
- No runtime tests were executed because this review covered documentation only.

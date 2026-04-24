# Validation Summary: How to List All Endpoints via the Portainer API - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer API
- Bash
- `curl`
- `jq`
- REST/HTTP authentication with JWT and API access tokens
- Docker Engine API proxying through Portainer

## Sources Consulted
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer CE 2.39.1 endpoint list handler: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/endpoints/endpoint_list.go
- Portainer CE 2.39.1 endpoint filtering logic: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/endpoints/filter.go
- Portainer CE 2.39.1 endpoint/status type definitions: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/portainer.go
- Portainer CE 2.39.1 auth handler: https://raw.githubusercontent.com/portainer/portainer/2.39.1/api/http/handler/auth/authenticate.go
- Docker Engine API reference: https://docs.docker.com/reference/api/engine/version/v1.44/

## Issues Found
1. **Incorrect endpoint type mapping.** The post described Portainer endpoint types `5`, `6`, and `7` as kubeconfig/cloud variants. Portainer’s current endpoint type enum defines these as `Local Kubernetes environment`, `Agent on Kubernetes environment`, and `Edge Agent on Kubernetes environment`. Updated the type list and the full example’s `case` statement to match the official enum.
2. **Unsafe shell JSON handling in examples.** The post used unquoted forms like `echo $ENDPOINTS | jq ...` and `echo $ENDPOINT | jq ...`, which can break JSON through shell word splitting or glob expansion. Replaced these with `printf '%s\n' "$VAR"` before piping to `jq`.
3. **Status mapping was overly broad in the full example.** The script treated any non-`1` status as `Down`. Portainer’s documented endpoint status enum is `1 = Up` and `2 = Down`, so the example was updated to map statuses explicitly.
4. **Terminology mismatch for API credentials.** The Step 1 comment used "API access key" even though Portainer documents user-generated API credentials as access tokens sent in the `X-API-Key` header. Updated the wording to "API access token" to match the official docs.

## Review Notes
- Verified that `GET /api/endpoints` supports `start`, `limit`, `search`, `name`, `types`, and related query parameters in current Portainer CE documentation and source.
- Checked the same endpoint definitions against Portainer CE `2.39.1` and CE `2.40.0`; the list/inspect routes, auth options, pagination parameters, and endpoint type enum relevant to this post are unchanged between those releases.
- Verified that `start` is effectively 1-based in Portainer’s handler implementation: Portainer decrements non-zero `start` values before slicing results, so `start=1&limit=10` and `start=11&limit=10` are valid examples.
- Verified that `POST /api/auth` returns a JWT in the `jwt` field and that authenticated requests can use either `Authorization: Bearer <token>` or `X-API-Key: <access-token>`.
- Verified that `/api/endpoints/{id}/docker/...` is the supported Portainer reverse-proxy pattern for Docker Engine API operations such as `GET /containers/json?all=true`.

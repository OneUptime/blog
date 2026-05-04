# Validation Summary: How to Build a Cost Tracking Tool with the Portainer API

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer API (v2.x)
- Docker Engine API (proxied through Portainer)
- curl
- jq
- Python 3 (`requests`, `collections.defaultdict`)
- Bash

## Sources Consulted
- [Accessing the Portainer API | Portainer Documentation](https://docs.portainer.io/api/access)
- [Portainer API usage examples](https://docs.portainer.io/api/examples)
- [Portainer HTTP API by example (deviantony gist)](https://gist.github.com/deviantony/77026d402366b4b43fa5918d41bc42f8)
- [Portainer Go API package reference](https://pkg.go.dev/github.com/portainer/portainer/api)
- [Docker Engine API — List containers](https://docs.docker.com/reference/api/engine/version/v1.43/#tag/Container/operation/ContainerList)

## Issues Found
- **jq query for `/api/endpoints` used lowercase shorthand field names.** The original query `{id, name, type}` would have returned `null` values because Portainer's endpoint objects are serialized with PascalCase keys (`Id`, `Name`, `Type`). Replaced with `{id: .Id, name: .Name, type: .Type}` to project the correct upstream fields while preserving the friendly lowercase output keys.
- **jq query for `/api/stacks` had the same casing issue.** The original `{name, status, type, endpointId}` would not have matched the API's `Name`, `Status`, `Type`, `EndpointId` fields. Updated to `{name: .Name, status: .Status, type: .Type, endpointId: .EndpointId}`.

## Review Notes
- The `/api/auth` JWT response field is correctly lowercase `jwt` — verified against Portainer docs.
- The Docker container listing query (`/api/endpoints/{id}/docker/containers/json`) correctly uses PascalCase fields (`.Id`, `.Names`, `.Image`, `.Status`, `.Labels`) because that endpoint proxies the upstream Docker Engine API, which uses PascalCase by convention.
- The Python script declares `COST_PER_GB_HOUR` but never uses it; this is a stylistic/code-quality matter (and the comment explicitly notes the calculation is "simplified"), not a technical error, so it was left as-is.
- Authentication via username/password to `/api/auth` still works in current Portainer versions, but the docs increasingly recommend pre-issued access tokens via the `X-API-Key` header for automation. Worth noting as a future improvement, though not incorrect.
- JWT tokens issued by `/api/auth` are valid for 8 hours by default — long-running schedulers should re-authenticate periodically.

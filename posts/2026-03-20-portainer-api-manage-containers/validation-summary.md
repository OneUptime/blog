# Validation Summary: How to Manage Containers via the Portainer API - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Docker Engine API
- Docker containers
- Shell scripting with `curl` and `jq`

## Sources Consulted
- Portainer Documentation, "Accessing the Portainer API" - https://docs.portainer.io/api/access
- Portainer Documentation, "API usage examples" - https://docs.portainer.io/sts/api/examples
- Portainer Documentation, "API documentation" - https://docs.portainer.io/api/docs
- Docker Docs, "Docker Engine API" - https://docs.docker.com/reference/api/engine/
- Docker Docs, "Docker Engine API v1.51 reference" - https://docs.docker.com/reference/api/engine/version/v1.51/
- Docker Docs, "Engine API version history" - https://docs.docker.com/reference/api/engine/version-history/

## Issues Found
- The post said a JWT or an API access token could be used, but all examples hardcoded `Authorization: Bearer`. I updated the examples to use an `AUTH_HEADER` variable and documented the correct header for each token type, because Portainer access tokens use `X-API-Key` while JWTs from `/api/auth` use `Authorization: Bearer`.
- The container stats example calculated CPU usage incorrectly by dividing total container CPU usage by system CPU usage. I replaced it with Docker's documented delta-based CPU formula and added `one-shot=true` with `stream=false` to match the intended single-sample snapshot behavior.
- The exec example used `Tty: false`, which returns a multiplexed raw stream when using the Docker API. I changed the exec create/start payloads to use `Tty: true` so the example produces readable output with `curl`.
- The logs section implied universal support, but Docker documents that `/containers/{id}/logs` works only with the `json-file` or `journald` logging drivers. I added that caveat.
- I also changed the container ID extraction to `printf '%s' "$CREATE_RESPONSE" | jq -r '.Id'` so the shell example does not rely on unsafe `echo` expansion.

## Review Notes
- Portainer's current docs refer to environments in the UI, but the reverse-proxy API path remains `/api/endpoints/{ENVIRONMENT_ID}/docker`, so the article's endpoint path convention is still correct.
- Docker's `one-shot=true` parameter for `/containers/{id}/stats` is a versioned Engine API feature. On older daemons that do not support it, `stream=false` still works but may wait for two collection cycles before returning CPU data.
- Validated against official Portainer and Docker documentation. The commands were not executed against a live Portainer environment in this repository.

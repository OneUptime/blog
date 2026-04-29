# Validation Summary: How to Manage Containers via the Portainer API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Docker Engine API
- Bash
- `curl`
- `jq`

## Sources Consulted
- Portainer documentation, "Accessing the Portainer API": https://docs.portainer.io/api/access
- Portainer documentation, "API usage examples": https://docs.portainer.io/sts/api/examples
- Portainer documentation, "API documentation": https://docs.portainer.io/api/docs
- Portainer documentation, "Activity": https://docs.portainer.io/admin/logs/activity
- Docker documentation, "docker container create": https://docs.docker.com/reference/cli/docker/container/create/
- Docker documentation, "docker container start": https://docs.docker.com/reference/cli/docker/container/start
- Docker documentation, "Start containers automatically": https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker documentation, "docker container stats": https://docs.docker.com/reference/cli/docker/container/stats/
- Docker documentation, "Docker Engine API": https://docs.docker.com/reference/api/engine/
- Docker documentation, archived "Engine API v1.24": https://docs.docker.com/reference/api/engine/version/v1.24/

## Issues Found
- The post used `Authorization: Bearer ...` while describing a Portainer access token. Portainer's documentation specifies using the access token in the `X-API-Key` header, so all examples were updated accordingly.
- The container endpoint overview implied that all container actions map to `/api/endpoints/{endpointId}/docker/containers/{action}`. Portainer documents `/api/endpoints/{endpointId}/docker` as the reverse-proxy base path, with container routes mirroring Docker API paths under that prefix, so that explanation was corrected.
- The "Creating a Container" example claimed it would "Create and start a new container", but Docker and Portainer document container creation and startup as separate operations. The example was fixed to capture the created container ID and then call the start endpoint explicitly.
- The conclusion said Portainer adds audit logging in general. Portainer documents activity logs under Business Edition, so the conclusion was narrowed to avoid implying that behavior across all editions.

## Review Notes
Docker's `/containers/{id}/stats` API returns raw memory usage data, so memory figures from the API can differ from the `docker stats` CLI output on Linux because the CLI subtracts cache usage.

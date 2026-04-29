# Validation Summary: How to Kill a Running Container in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine API
- Docker CLI
- `curl`
- Python 3

## Sources Consulted
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer API access documentation: https://docs.portainer.io/2.21/api/access
- Portainer Docker roles and permissions: https://docs.portainer.io/advanced/docker-roles-and-permissions
- Portainer remove-container documentation: https://docs.portainer.io/user/docker/containers/remove
- Portainer edit or duplicate container documentation: https://docs.portainer.io/2.27/user/docker/containers/edit
- Docker Engine API reference overview: https://docs.docker.com/reference/api/engine/
- Docker Engine API operation reference: https://docs.docker.com/reference/api/engine/version/v1.24/
- Docker `container kill` reference: https://docs.docker.com/reference/cli/docker/container/kill/
- Docker `inspect` reference: https://docs.docker.com/reference/cli/docker/inspect/

## Issues Found
- The API example truncated the container ID to 12 characters before reusing it in Docker API paths. I changed this to use the full `Id` returned by the API and added a `break`, which aligns the example with Docker's documented API identifier usage and avoids relying on a shortened prefix.
- The "Duplicate a Container" section contained an invalid and misleading CLI example. `docker inspect --format '{{json .Config}}'` does not capture the full runtime configuration needed to duplicate a container, and the `docker run` snippet was not a workable duplicate flow. I replaced that section with Portainer's documented `Duplicate/Edit` workflow.

## Review Notes
- Portainer's current API docs prefer per-user access tokens via the `X-API-Key` header for ongoing automation, but the post's `/api/auth` JWT flow remains a valid documented authentication method.
- Portainer proxies Docker API requests through `/api/endpoints/<ENVIRONMENT_ID>/docker`, so the container action endpoints in the post remain consistent with Docker's API behavior.

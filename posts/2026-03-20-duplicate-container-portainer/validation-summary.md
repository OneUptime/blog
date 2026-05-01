# Validation Summary: How to Duplicate a Container in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Engine API
- Docker CLI
- `curl`
- Python 3

## Sources Consulted
- Portainer Documentation: Edit or duplicate a container - https://docs.portainer.io/2.33-lts/user/docker/containers/edit
- Portainer Documentation: Containers - https://docs.portainer.io/2.33-lts/user/docker/containers
- Portainer Documentation: API usage examples - https://docs.portainer.io/sts/api/examples
- Portainer Documentation: Accessing the Portainer API - https://docs.portainer.io/2.21/api/access
- Docker Docs: `docker container create` - https://docs.docker.com/reference/cli/docker/container/create/
- Docker Docs: `docker inspect` - https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: Docker Engine API reference - https://docs.docker.com/reference/api/engine/

## Issues Found
- The Portainer UI section did not describe Portainer's documented duplication workflow. It listed generic lifecycle actions instead of the `Duplicate/Edit` flow. I replaced the steps so they now match Portainer's official container duplication instructions.
- The API section did not duplicate a container. It only showed start, stop, restart, kill, remove, pause, unpause, and inspect operations. I replaced it with a create-and-start example using Portainer's documented Docker API proxy endpoint and `X-API-Key` authentication pattern.
- The API example implied a straight copy of a running container without accounting for host-binding conflicts. I corrected the wording and example so the duplicate uses a new container name and a different published host port.
- The Docker CLI example was syntactically invalid because it used a shell line continuation immediately before a comment, and it only inspected `.Config`, which omits important runtime settings. I replaced it with a valid `docker inspect --type=container` example plus `docker container create` and `docker container start`.

## Review Notes
- Portainer's documentation confirms that duplicating a container in the UI is done through **Duplicate/Edit**, then **Deploy the container**, with a new container name.
- Portainer's current API examples use `X-API-Key` for proxied Docker requests, while JWT-based `/api/auth` examples are still documented for direct authentication flows.
- If the original container publishes host ports, the duplicate cannot reuse the same host port while both containers are running. The post now reflects that caveat.
- The examples keep `--insecure` because the post targets `https://localhost:9443`, which commonly uses Portainer's default self-signed certificate. With a trusted certificate, `--insecure` should be omitted.

# Validation Summary: How to Add a Docker Standalone Environment to Portainer via Socket - Add

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer Community Edition
- Docker Engine
- Docker Compose
- Docker socket (`/var/run/docker.sock`)
- Portainer HTTP API
- Rootless Docker

## Sources Consulted
- Portainer docs: Connect to the Docker Socket - https://docs.portainer.io/admin/environments/add/docker/socket
- Portainer docs: Add a local environment - https://docs.portainer.io/admin/environments/add/local
- Portainer docs: Initial setup (CE) - https://docs.portainer.io/start/install-ce/server/setup
- Portainer docs: Add an environment via the Portainer API - https://docs.portainer.io/admin/environments/add/api
- Portainer CE OpenAPI spec 2.39.1 - https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer docs: Install Portainer CE with Docker on Linux (2.33 LTS) - https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Docker docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker docs: Running containers - https://docs.docker.com/engine/containers/run/
- Docker docs: Linux post-installation steps - https://docs.docker.com/engine/install/linux-postinstall/
- Docker docs: Rootless mode tips - https://docs.docker.com/engine/security/rootless/tips/

## Issues Found
- The `docker run`, Compose, and rootless examples used the floating `portainer/portainer-ce:latest` tag. I changed them to `portainer/portainer-ce:lts` to match current Portainer installation guidance and avoid a floating tag.
- The Compose example used the top-level `version` field. I removed it because current Docker Compose documents it as obsolete and only retained for backward compatibility.
- Step 4 described adding a "local" environment after Portainer was already deployed. I corrected this to distinguish the auto-created local environment from additional socket-connected Docker Standalone environments, because Portainer documents that the special local environment can only be created when the Portainer Server container is deployed.
- The socket permissions section suggested `sudo usermod -aG docker portainer`, which is host-user guidance and not appropriate for a containerized Portainer process. I replaced it with container-appropriate guidance using the socket group ID and `--group-add`, and removed `chmod 666` as a general recommendation.
- The rootless Docker example hard-coded `/run/user/1000/docker.sock` and omitted Portainer's documented rootless caveat. I changed it to `/run/user/<UID>/docker.sock`, added the limitations note, and used `9443:9443` to avoid privileged-port issues common in rootless setups.
- The security section recommended a Docker socket proxy configuration via `DOCKER_HOST` that is not documented by current Portainer docs for this workflow. I replaced it with Portainer's documented note that direct Docker socket connections are a legacy option and that the Edge Agent is recommended for most use cases.

## Review Notes
- Portainer's `/api/auth` JWT flow and `/api/endpoints` listing used in the verification example are still valid. The `Status` field is documented in the CE 2.39.1 OpenAPI schema for endpoints.
- The main examples map host port `443` to container port `9443`. This is technically valid, but it assumes the host can bind port `443` and that the port is not already in use.
- Direct Docker socket access remains supported, but current Portainer documentation classifies it as a legacy connection method.

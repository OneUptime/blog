# Validation Summary: How to Set Up Portainer for Automotive Edge Deployments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Portainer Edge Agent
- Portainer Edge Stacks
- Portainer API
- Docker
- Docker Compose
- Linux SocketCAN
- Automotive edge computing

## Sources Consulted
- Portainer docs: Install Edge Agent Standard on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer docs: The Portainer Edge Agent - https://docs.portainer.io/advanced/edge-agent
- Portainer docs: Edge Stacks - https://docs.portainer.io/user/edge/stacks
- Portainer docs: Accessing the Portainer API - https://docs.portainer.io/api/access
- Portainer API docs 2.39.1 BE - https://api-docs.portainer.io/?edition=ee&version=2.39.1
- Portainer docs: Updating the Edge Agent - https://docs.portainer.io/start/upgrade/edge
- Docker docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker docs: Define services in Docker Compose (`devices`, `volumes`) - https://docs.docker.com/reference/compose-file/services/
- Linux kernel docs: SocketCAN - Controller Area Network - https://docs.kernel.org/networking/can.html

## Issues Found
- The Edge Agent enrollment command omitted the standard mounts Portainer documents for Docker Standalone Edge Agents (`/var/lib/docker/volumes`, `/:/host`, and `/data`). I added those mounts and switched the example to the official `portainer/agent:lts` image so the command matches current Portainer guidance.
- The Portainer Server example used `portainer/portainer-ee:latest` while the corrected agent example uses the LTS track. I changed the server example to `portainer/portainer-ee:lts` so the server and agent examples stay on the same supported release track.
- The Compose snippet used the obsolete top-level `version` field. I removed it because current Compose uses the latest schema automatically and warns that `version` is obsolete.
- The telemetry container attempted to expose a CAN interface as a bind mount under `volumes`. Linux SocketCAN exposes CAN through the networking stack, not a device bind mount, so I removed the invalid mount and clarified that host networking is how interfaces such as `can0` are reached.
- The rollback API example used the wrong Portainer API path (`/api/edge/stacks/42`) and authenticated with a bearer token example that does not match Portainer’s documented API-key pattern. I corrected the example to `PUT /api/edge_stacks/42`, added `Content-Type: application/json`, and used the documented `X-API-Key` header.

## Review Notes
- The post is technically salvageable and relevant after the fixes above.
- Portainer’s docs currently show Business Edition 2.39.1 as the latest LTS release and also list 2.40.0 in the API docs version selector as a newer non-LTS release. Using the `lts` tags keeps the examples aligned with the supported long-term track without pinning to a specific patch version.
- The staged rollout guidance in Step 5 is directionally correct. Portainer’s current Edge Stacks documentation also documents built-in staggered update strategies and rollback-on-failure behavior for Edge Stack updates.

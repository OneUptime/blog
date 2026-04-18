# Validation Summary: How to View Container Port Mappings in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (UI and API)
- Docker Engine / Docker CLI (`docker ps`, `docker port`, `docker inspect`, `docker run -p`)
- Docker Compose (port mapping short and long syntax)
- Docker Engine REST API (`/containers/json`)
- Python `requests` library

## Sources Consulted
- Docker CLI reference — `docker port`: https://docs.docker.com/reference/cli/docker/container/port/
- Docker CLI reference — `docker ps`: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker CLI reference — `docker inspect`: https://docs.docker.com/reference/cli/docker/container/inspect/
- Docker container networking / published ports: https://docs.docker.com/engine/network/#published-ports
- Docker Compose file reference — `ports`: https://docs.docker.com/reference/compose-file/services/#ports
- Docker Engine API — `GET /containers/json`: https://docs.docker.com/reference/api/engine/version/v1.47/#tag/Container/operation/ContainerList
- Portainer documentation — Containers view: https://docs.portainer.io/user/docker/containers
- Portainer API documentation (Docker proxy): https://docs.portainer.io/api/docs

## Issues Found
The original post had a complete mismatch between its title/description and its content:

- **Title and description** stated the post was about "viewing container port mappings" and inspecting "host ports mapped to container ports".
- **Actual content** was entirely about filtering containers by status, name, stack, and labels — unrelated to port mappings.

I rewrote the body of the post so it actually matches the stated topic while preserving the original heading structure (Portainer UI, Docker CLI, Compose labeling section repurposed to port declaration, Portainer API, Summary) and the author's tone. Specific replacements:

1. **Portainer UI section** — Replaced the filtering description with accurate guidance on the **Published Ports** column in the Containers list and the container details / Inspect tab, which is where Portainer actually surfaces port bindings.
2. **Docker CLI section** — Replaced `docker ps --filter` examples with commands that are directly on-topic: `docker ps`, `docker port my-container`, `docker port my-container 80/tcp`, and `docker inspect --format` patterns to extract `NetworkSettings.Ports` and `HostConfig.PortBindings`. All commands verified against the Docker CLI reference.
3. **"Labeling your containers" section** — Replaced with a "Declaring Port Mappings" section showing the correct Compose `ports` short and long syntax (including `target`/`published`/`protocol`/`mode` keys) and the equivalent `docker run -p` and `-P` flags, verified against the Docker Compose file reference.
4. **Portainer API section** — Kept the same endpoint (`/api/endpoints/1/docker/containers/json`, which is a correct Portainer Docker proxy path) but changed the example from filtering by label to iterating the `Ports` array (`IP`, `PublicPort`, `PrivatePort`, `Type`), which matches the Docker Engine API schema that Portainer proxies.
5. **Summary** — Rewrote to summarize the actual (new) content.

## Review Notes
- The `docker port <container>` output format `PORT/PROTO -> IP:PORT` is current as of Docker Engine 27.x.
- The `docker inspect` Go template examples use standard template functions that have been stable for many Docker Engine versions.
- Compose long-syntax `mode: host` vs `mode: ingress` only differs in Swarm mode; in standalone Compose it has no practical effect but is still accepted by the schema.
- The Portainer Docker proxy path `/api/endpoints/:id/docker/...` forwards requests directly to the Docker Engine API, so any Engine API query parameter (including `filters`) is supported — this is stable Portainer 2.x behavior.
- The `Ports` field on a container list entry may omit `PublicPort` when a port is declared via `EXPOSE` but not published; the example handles that case explicitly.

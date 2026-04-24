# Validation Summary: How to Use Portainer in Manufacturing OT Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Edge Agent
- Portainer Edge Stacks and Portainer HTTP API
- Docker Engine on Ubuntu
- Docker Compose
- Bash scripting
- Manufacturing OT integrations (PLCs, Modbus, MES)
- InfluxDB
- Telegraf

## Sources Consulted
- Portainer documentation: Install Edge Agent Standard on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer documentation: Updating the Edge Agent - https://docs.portainer.io/start/upgrade/edge
- Portainer documentation: Edge Stacks - https://docs.portainer.io/user/edge/stacks
- Portainer documentation: API documentation - https://docs.portainer.io/api/docs
- Portainer CE 2.39.1 OpenAPI spec - https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker documentation: Install Docker Engine on Ubuntu - https://docs.docker.com/engine/install/ubuntu/
- Docker documentation: Live restore - https://docs.docker.com/engine/daemon/live-restore/
- Docker documentation: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker documentation: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker documentation: Define services in Docker Compose - https://docs.docker.com/reference/compose-file/services/
- Docker documentation: Define and manage networks in Docker Compose - https://docs.docker.com/reference/compose-file/networks/

## Issues Found
- The Docker install snippet wrote `/etc/docker/daemon.json` without elevated redirection and duplicated Docker service management commands. I changed it to use Docker's documented convenience-script flow with `sudo`, `sudo tee`, and a single `enable` plus `restart`.
- The Portainer Edge Agent example used an invented `EDGE_ID`, an undocumented `EDGE_SERVER_HOST` variable, omitted the documented host and volume mounts, and used the floating `latest` tag. I changed it to use Portainer-generated `EDGE_ID` and `EDGE_KEY` placeholders, added the documented mounts, and switched to `portainer/agent:lts`.
- The Compose examples used the obsolete top-level `version` key. I removed it from all Compose snippets.
- The quality inspection stack used `runtime: nvidia` and marked the application network as `internal: true` even though the services need to reach PLC and MES endpoints. I changed the GPU syntax to `gpus: all` and removed the externally isolated network setting.
- The PLC section claimed Modbus/OPC-UA while the example only showed Modbus, and the Compose snippet omitted top-level `volumes` and `networks` declarations. I corrected the heading and completed the missing Compose definitions.
- The PLC example also mixed a specific third-party image name with custom environment variables and file paths that were not documented together. I normalized that service to a generic `mfg/modbus-collector` example to avoid implying an unsupported vendor-specific configuration.
- The production update script incorrectly tried to target individual machines even though Portainer Edge Stacks deploy to Edge Groups, used the wrong API path, built invalid JSON for `StackFileContent`, and would create a new stack instead of updating an existing one. I rewrote it to wait until the full line is idle, inspect existing edge stacks, and use Portainer's documented `create/string` and `PUT /edge_stacks/{id}` APIs with valid JSON payloads.
- The safety monitor Compose example used `deploy.restart_policy` in a standalone Compose context where `deploy` settings may be ignored, and it omitted the top-level network declaration. I simplified it to `restart: always` and added the missing network definition.

## Review Notes
- The `mfg/*` images in the post are illustrative application images, so their internal environment variables and APIs were reviewed for Docker and Compose correctness rather than against vendor product documentation.
- Docker documents the `get.docker.com` convenience script as mainly suitable for non-interactive provisioning and development-oriented installs; a repository-based install would be a stronger future hardening choice for a production OT guide.
- Portainer's Edge Agent documentation requires the Portainer API port (typically `9443`) and tunnel port (typically `8000`) to be reachable from the Edge environment.

# Validation Summary: How to Update Edge Agents with Automatic Rollback - Agents Automatic

## Status
validated

## Post Type
Tutorial / Guide (Portainer Edge Agent deployment)

## Technologies Covered
- Portainer (Edge Compute, HTTP API)
- Portainer Edge Agent (standard and async modes)
- Docker (Linux and Windows, named-pipe mount)
- Bash / curl / Python3 (for API interaction)
- Mermaid (flowchart)

## Sources Consulted
- Portainer Edge Agent docs: https://docs.portainer.io/admin/environments/add/docker/edge and https://docs.portainer.io/admin/environments/add/docker/edge-async
- Portainer Edge Compute settings (server-side ping/snapshot/command intervals): https://docs.portainer.io/admin/settings/edge
- Portainer requirements and ports: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer agent source — env var definitions: https://github.com/portainer/agent/blob/develop/os/options.go
- Portainer agent source — async poll (server-pushed intervals): https://github.com/portainer/agent/blob/develop/edge/poll_async.go
- Portainer agent README (reverse tunnel via chisel): https://github.com/portainer/agent/blob/develop/README.md
- Portainer API `EndpointCreationType` values: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go
- Docker Hub image: https://hub.docker.com/r/portainer/agent
- Windows named-pipe mount syntax: moby/moby#34795 and portainer/portainer#1179

## Issues Found
1. **Wrong protocol description for the Edge Agent tunnel.** The post said the Edge Agent connects outbound on port 8000 via "WebSocket Secure (WSS)". In reality, the standard-mode Edge Agent opens a reverse tunnel (chisel — SSH over a WebSocket upgrade) to the tunnel port (default `8000`), and async mode does not use the tunnel at all — it polls the Portainer HTTPS API (default `9443`). Updated the Mermaid diagram label and the surrounding paragraph to describe both modes accurately.
2. **Invalid environment variables in the async-mode `docker run`.** The post set `EDGE_CHECKIN_INTERVAL=30` and `EDGE_SNAPSHOT_INTERVAL=60` on the agent container. Neither of these (nor `EDGE_PING_INTERVAL`) exist in the agent's env-var list (`agent/os/options.go`). In async mode the ping/snapshot/command intervals are controlled by the Portainer server (Edge Compute settings) and delivered to the agent via the poll response (`agent/edge/poll_async.go`). Removed the two invalid env vars and added a one-line note pointing readers at the server-side configuration.

## Review Notes
- The post title promises "Automatic Rollback" but the body does not actually cover rollback — it covers Edge Agent deployment. That is a content-scope concern rather than a technical-accuracy one, so it was left unchanged per the review scope.
- `portainer/agent:latest` is valid but Portainer's own install wizard pins a specific version tag (e.g. `portainer/agent:2.21.4`). Pinning is generally preferred in production but the `:latest` usage is not incorrect.
- The Windows named-pipe mount `-v //./pipe/docker_engine://./pipe/docker_engine` is functional — Docker CLI normalizes the forward-slash form — though Portainer's docs use the backslash form `\\.\pipe\docker_engine:\\.\pipe\docker_engine`. Left as-is because it works in shells where backslashes would require escaping.
- `EDGE_INSECURE_POLL=0` is the default; it is kept in the example for explicitness.
- `EndpointCreationType: 4` and `EdgeCheckinInterval` on the `POST /api/endpoints` body are correct.

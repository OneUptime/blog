# Validation Summary: How to Configure the Tunnel Server Address for Edge Agents

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Server and Edge Agent)
- Docker (Standalone, Windows containers)
- Portainer HTTP API
- WebSocket Secure (WSS) tunneling
- curl, python3 (used in helper scripts)

## Sources Consulted
- Portainer Edge Agent installation docs: https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer Edge Agent (async) installation docs: https://docs.portainer.io/admin/environments/add/docker/edge-async
- Portainer Edge Agent overview: https://docs.portainer.io/advanced/edge-agent
- Portainer endpoint create handler source: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_create.go
- Portainer agent source: https://github.com/portainer/agent

## Issues Found
1. The `POST /api/endpoints` request was using `Content-Type: application/json` with a JSON body. The Portainer API endpoint expects `multipart/form-data`, per the `@accept multipart/form-data` declaration in the handler. The JSON form would fail validation. Fixed by switching to `-F` form fields.
2. The original payload was missing two required fields for `EndpointCreationType=4` (Edge Agent): `URL` (the Portainer server URL — cannot be empty for edge endpoints) and `EdgeTunnelServerAddress` (the address the Edge Agent should tunnel to — directly relevant to the post's title). Both fields are now included in the curl example.
3. The accompanying comment "Create an edge environment and get the deployment script" was slightly misleading — the API call returns the endpoint object (including EdgeID/EdgeKey), not a ready-to-paste deployment script. Reworded to "Create an edge environment and get the EdgeID/EdgeKey for the deployment".

## Review Notes
- Port `8000` for the Edge tunnel and `9443` for Portainer HTTPS are correct defaults.
- `EndpointCreationType=4` is the correct enum value for Edge Agent environments.
- Environment variables `EDGE`, `EDGE_ID`, `EDGE_KEY`, `EDGE_INSECURE_POLL`, `EDGE_ASYNC`, `EDGE_CHECKIN_INTERVAL`, `EDGE_SNAPSHOT_INTERVAL` are all valid for the Portainer agent image.
- Volume mounts (`/var/run/docker.sock`, `/var/lib/docker/volumes`, `/:/host`, `portainer_agent_data:/data`) match the recommended Standard mode deployment.
- The Windows named-pipe mount syntax `//./pipe/docker_engine://./pipe/docker_engine` is the standard form when running with Docker for Windows.
- The Edge tunnel server address itself is encoded inside `EDGE_KEY`; the agent does not require a separate `EDGE_TUNNEL_SERVER_ADDR` env var for normal deployment, which is implicit in the post.
- Using `--insecure` with curl and `EDGE_INSECURE_POLL=0` is fine for documentation but readers should be reminded that production deployments should use proper TLS certificates rather than `--insecure`.

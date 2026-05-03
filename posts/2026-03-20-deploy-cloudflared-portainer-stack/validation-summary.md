# Validation Summary: How to Deploy cloudflared as a Portainer Stack - Deploy

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Cloudflare Tunnels (Zero Trust)
- cloudflared daemon
- Docker / Docker Compose
- Portainer (stack management)

## Sources Consulted
- Cloudflare Zero Trust documentation: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
- cloudflared Docker image on Docker Hub: https://hub.docker.com/r/cloudflare/cloudflared
- cloudflared GitHub repo: https://github.com/cloudflare/cloudflared
- Cloudflare tunnel run guide (token-based): https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/
- Compose file reference: https://docs.docker.com/compose/compose-file/
- Portainer stacks documentation: https://docs.portainer.io/user/docker/stacks

## Issues Found
- "Verify Tunnel Status" section originally said "In the Portainer container logs" but the example output (`Starting tunnel`, `Connection registered`) is clearly from cloudflared, not Portainer. Updated to "In the cloudflared container logs" so readers look at the right container.

## Review Notes
- The Compose `version: "3.8"` field is accepted but is considered obsolete in modern Docker Compose v2 — it is harmless to include and not technically incorrect, but could be dropped in a future revision.
- `command: tunnel --no-autoupdate run` together with `TUNNEL_TOKEN` env var is the documented way to run a token-based remote tunnel; correct.
- The example image tag `cloudflare/cloudflared:2024.1.0` is illustrative; readers should pick a real published tag (Cloudflare uses `YYYY.M.PATCH` versioning) when pinning. The principle of pinning a tag for predictable updates is correct.
- Connecting to the existing `portainer_default` external network is a sensible choice so cloudflared can resolve other containers (e.g., `portainer:9443`) by service name.

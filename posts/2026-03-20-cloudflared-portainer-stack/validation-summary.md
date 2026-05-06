# Validation Summary: How to Deploy Cloudflared as a Portainer Stack

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Cloudflare Tunnel / `cloudflared`
- Cloudflare Zero Trust
- Portainer
- Docker Compose
- Docker networking

## Sources Consulted
- Cloudflare Tunnel tokens: https://developers.cloudflare.com/tunnel/advanced/tunnel-tokens/
- Create a tunnel (dashboard): https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/
- Cloudflare Tunnel run parameters: https://developers.cloudflare.com/tunnel/advanced/run-parameters/
- Set up Cloudflare Tunnel: https://developers.cloudflare.com/tunnel/setup/
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Install Portainer CE with Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Add a new stack in Portainer: https://docs.portainer.io/user/docker/stacks/add
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose networking: https://docs.docker.com/compose/how-tos/networking/
- Official `cloudflared` repository and releases: https://github.com/cloudflare/cloudflared

## Issues Found
- The tunnel-token retrieval steps were inaccurate for a tunnel that already exists. I updated the path to `Networks → Connectors → Cloudflare Tunnels`, changed the flow to selecting the existing tunnel, and added `Add a replica`, which is how Cloudflare documents retrieving a remotely-managed tunnel token.
- The monitoring section used an outdated or incomplete Cloudflare navigation path. I updated it to `Networks → Connectors → Cloudflare Tunnels` so the health-status check matches the current dashboard flow.
- The two main Compose examples included the top-level `version` field. I removed it because current Docker Compose treats `version` as obsolete and ignores it.
- The "Multiple Tunnels for Different Environments" snippet was incomplete. I added `command: tunnel --no-autoupdate run` and `restart: unless-stopped` to each `cloudflared` service so the containers actually start a tunnel instead of exiting immediately.
- The pinned image example referenced an older `cloudflared` release. I updated it to `2026.3.0`, which was the latest official release visible during validation on May 6, 2026.

## Review Notes
- The `http://portainer:9000` origin target is technically valid for same-stack container-to-container traffic and avoids self-signed HTTPS handling. If Portainer is later run with HTTP disabled, that origin URL would need to change to HTTPS on `9443` with matching origin TLS settings.
- The Compose snippets were checked with `docker compose config` after the fixes and parsed successfully.

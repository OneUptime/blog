# Validation Summary: How to Set Up Cloudflare Tunnel for Portainer Access - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cloudflare Tunnel (`cloudflared`)
- Cloudflare Access / Zero Trust
- Portainer CE
- Docker Compose
- WebSockets

## Sources Consulted
- Cloudflare One docs, Create a tunnel (dashboard): https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/get-started/create-remote-tunnel/
- Cloudflare One docs, Tunnel run parameters: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/run-parameters/
- Cloudflare One docs, Protocols for published applications: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/protocols/
- Cloudflare docs, Origin parameters: https://developers.cloudflare.com/tunnel/advanced/origin-parameters/
- Cloudflare One docs, Publish a self-hosted application to the Internet: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/
- Cloudflare Network docs, WebSockets: https://developers.cloudflare.com/network/websockets/
- Cloudflare One docs, Tunnel with firewall: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-with-firewall/
- Portainer docs, Install Portainer CE with Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Docker docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The Cloudflare dashboard navigation was outdated. I updated the path from `Networks -> Tunnels` to `Networks -> Connectors -> Cloudflare Tunnels` and adjusted the route terminology to the current published-application wording used in Cloudflare's docs.
- The post routed traffic to `portainer:9000` over HTTP. Current Portainer documentation describes `9443` as the default UI port and `9000` as a legacy HTTP port, so I changed the route to `HTTPS` on `portainer:9443`.
- The post did not account for Portainer's default self-signed certificate when using HTTPS to the origin. I added the required `No TLS Verify` guidance and corrected its location to `TLS Settings`, since it was previously shown under `HTTP Settings`.
- The Docker Compose example used the top-level `version: "3.8"` field. Docker now documents this field as obsolete, so I removed it.
- The tunnel verification expectations were too specific for current `cloudflared` output. I updated the wording to match the documented `Registered tunnel connection` log format without assuming an exact connector count.
- The monitoring section mixed YAML into a Bash code block, queried `localhost:2000` before configuring the metrics endpoint, and used `cloudflared tunnel info` without the required tunnel name or UUID argument. I split the config and commands, added the compose restart step, and replaced the invalid status command with a log-based check that works as written.
- The Cloudflare Access navigation was slightly outdated. I updated it to `Access controls -> Applications` to match current documentation.

## Review Notes
- Cloudflare recommends creating the Access application before publishing the tunnel route so the application is not temporarily exposed during setup. The post keeps the original sequence, but readers should be aware of that operational caveat.
- The examples still use Docker image `:latest` tags. That is technically valid, but pinned or Portainer `lts`/`sts` tags would make the guide more reproducible over time.

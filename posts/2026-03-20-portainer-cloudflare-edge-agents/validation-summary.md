# Validation Summary: How to Set Up Cloudflare Tunnel for Portainer Edge Agents - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer Edge Agent
- Portainer Server
- Cloudflare Tunnel (`cloudflared`)
- Cloudflare Access service tokens
- Docker
- Docker Compose

## Sources Consulted
- Portainer Edge Agent architecture: https://docs.portainer.io/advanced/edge-agent
- Install Edge Agent Standard on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/edge
- Update / version-match the Edge Agent: https://docs.portainer.io/start/upgrade/edge
- Portainer reverse proxy guidance (separate UI and edge hostnames): https://docs.portainer.io/advanced/reverse-proxy/traefik
- Portainer FAQ on Agent / Edge Agent security: https://docs.portainer.io/faqs/getting-started/how-does-portainer-secure-connectivity-to-and-from-agents-and-edge-agents
- Cloudflare Tunnel routing and supported published application protocols: https://developers.cloudflare.com/tunnel/routing/
- Cloudflare Tunnel DNS record creation: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/dns/
- Cloudflare Tunnel configuration and firewall behavior: https://developers.cloudflare.com/tunnel/configuration/
- `cloudflared tunnel run` parameters, including `TUNNEL_TOKEN`: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/cloudflared-parameters/run-parameters/
- Cloudflare Access service token authentication: https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/

## Issues Found
- The post treated `cloudflared` on the remote host as a prerequisite. For Portainer Edge Agents, the remote host does not need `cloudflared` unless you are separately publishing services from that host. I corrected the prerequisites, architecture diagram, and explanatory text.
- The DNS example only created a record for `edge.portainer.example.com` even though the tunnel config exposed both `portainer.example.com` and `edge.portainer.example.com`. I added the missing DNS route for the Portainer UI hostname.
- The Portainer configuration section conflated the Portainer API URL with the Edge tunnel server address. Portainer’s Edge Agent uses both values separately. I corrected the section to distinguish the API URL from the tunnel server address.
- The `docker run` example contained an invalid shell line continuation because of an inline comment after `\`. I moved the certificate note outside the command and fixed the example.
- The post used `portainer/agent:latest`, which is not the safest guidance because Portainer recommends matching the agent version to the Portainer Server version. I changed the examples to explicitly tell readers to use the same agent version as their Portainer Server.
- The Compose example set `EDGE_INSECURE_POLL: "0"` and `AGENT_CLUSTER_ADDR: ""`. The former is unnecessary when TLS verification should remain enabled, and the latter was misleading for this standalone example. I removed both and clarified that `EDGE_INSECURE_POLL=1` is only needed for self-signed certificates.
- The verification section used `docker logs portainer_edge_agent --follow` even though the deployment example used Compose. I changed this to `docker compose logs -f edge-agent`, which matches the example deployment method.
- The Cloudflare Access section incorrectly claimed Edge Agents could use Access service tokens via `EDGE_ASYNC_TIMEOUT` / `EDGE_CHECKIN_INTERVAL`. Those variables do not provide Cloudflare Access authentication, and Cloudflare service-token auth requires request headers (`CF-Access-Client-Id` and `CF-Access-Client-Secret`). I replaced that section with accurate guidance and clarified that Portainer’s Edge flow is already protected by mTLS and rotating Edge credentials.

## Review Notes
- Portainer’s reverse proxy documentation still uses the internal Portainer UI port `9000` behind the proxy, even though direct Portainer installs default to `9443` for HTTPS. I left the internal `9000` example in place because it matches Portainer’s documented reverse proxy pattern.
- The Portainer documentation distinguishes the Edge Agent’s polling/API URL from the reverse tunnel address. If a deployment uses different hostnames for those two paths, readers should verify the generated Edge configuration carefully in their Portainer edition and version.

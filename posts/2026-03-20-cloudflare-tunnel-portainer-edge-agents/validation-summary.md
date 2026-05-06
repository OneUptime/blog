# Validation Summary: How to Set Up Cloudflare Tunnel for Portainer Edge Agents

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Server
- Portainer Edge Agent
- Cloudflare Tunnel (`cloudflared`)
- Docker
- Docker Compose
- Cloudflare Access

## Sources Consulted
- Portainer documentation: The Portainer Edge Agent - https://docs.portainer.io/advanced/edge-agent
- Portainer documentation: Install Edge Agent Standard on Docker Standalone - https://docs.portainer.io/admin/environments/add/docker/edge
- Portainer documentation: Requirements and prerequisites - https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer documentation: Install Portainer CE with Docker on Linux - https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer documentation: Edge Compute - https://docs.portainer.io/2.21/admin/settings/edge
- Portainer documentation: CLI configuration options - https://docs.portainer.io/advanced/cli
- Portainer source: `portainer/agent` README and Edge mode implementation - https://github.com/portainer/agent
- Portainer source: reverse tunnel key generation - https://github.com/portainer/portainer/blob/develop/api/chisel/key.go
- Cloudflare documentation: Create a locally-managed tunnel - https://developers.cloudflare.com/tunnel/advanced/local-management/create-local-tunnel/
- Cloudflare documentation: Configuration file - https://developers.cloudflare.com/tunnel/advanced/local-management/configuration-file/
- Cloudflare documentation: DNS records - https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/dns/
- Cloudflare documentation: Protocols for published applications - https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/protocols/
- Cloudflare documentation: Origin parameters - https://developers.cloudflare.com/tunnel/advanced/origin-parameters/
- Cloudflare documentation: Managed OAuth - https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/managed-oauth/
- Cloudflare documentation: Tunnel tokens - https://developers.cloudflare.com/tunnel/advanced/tunnel-tokens/

## Issues Found
- The post used Portainer's legacy HTTP UI port `9000` as the primary UI origin. I changed this to `9443`, which is the current default HTTPS UI/API port, and kept `8000` for the Edge tunnel server.
- The Cloudflare Tunnel ingress rules pointed both Portainer services at plain HTTP origins. I changed them to `https://localhost:9443` and `https://localhost:8000` and added `originRequest.noTLSVerify: true` because Portainer commonly uses a self-signed certificate by default.
- The tunnel setup omitted `cloudflared tunnel login` and never started the tunnel. I added the login step and `cloudflared tunnel run portainer-server`.
- The Step 2 field names were outdated and implied the separate tunnel address was universally configurable. I updated the names to Portainer's current labels and noted that the separate tunnel server address is a Business Edition UI feature.
- The Edge Agent example incorrectly enabled `EDGE_INSECURE_POLL=1`. I removed it because the agent connects to Cloudflare's public HTTPS endpoint in this setup, not directly to Portainer's self-signed certificate.
- The post used `latest` image tags in examples. I changed them to a placeholder matching the Portainer server version/tag so the examples do not imply an unsafe server/agent version mismatch.
- The Docker Compose section mixed a token-based `cloudflared` container with a local config-based explanation. I corrected the text so token-based deployments configure published application routes in the Cloudflare dashboard, not in a local config file.
- The Cloudflare Access guidance was inaccurate. Protecting the same hostname used by Edge Agent polling would break agent communication, so I changed the guidance to treat Access as a separate browser-only hostname concern and to keep the agent-facing hostnames unprotected by interactive Access.
- The verification step relied on exact log strings that are not stable across versions. I changed it to check for successful polling and reverse tunnel connection messages instead.

## Review Notes
- Portainer documents that Edge Agents poll the Portainer API URL and establish the reverse tunnel on port `8000`; the agent implementation also shows the reverse tunnel runs over WebSockets secured by SSH/chisel, which is why routing the Edge endpoint as an HTTPS origin through Cloudflare Tunnel is plausible.
- Cloudflare documents that non-HTTP published application protocols require client-side `cloudflared`, so the Edge endpoint should be treated as an HTTPS/WebSocket origin here, not as a raw TCP published application.
- If a production deployment uses trusted certificates on the Portainer origins instead of the default self-signed certificates, `noTLSVerify: true` can be replaced with proper origin certificate validation.

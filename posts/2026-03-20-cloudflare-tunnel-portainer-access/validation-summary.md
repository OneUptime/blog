# Validation Summary: How to Access Portainer Securely with a Cloudflare Tunnel

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cloudflare Tunnel
- `cloudflared`
- Cloudflare Access / Zero Trust
- Cloudflare DNS
- Portainer
- Docker

## Sources Consulted
- Cloudflare Tunnel overview: https://developers.cloudflare.com/tunnel/
- Create a locally-managed tunnel: https://developers.cloudflare.com/tunnel/advanced/local-management/create-local-tunnel/
- Cloudflare Tunnel configuration file: https://developers.cloudflare.com/tunnel/advanced/local-management/configuration-file/
- Cloudflare Tunnel routing: https://developers.cloudflare.com/tunnel/routing/
- Cloudflare Tunnel run parameters: https://developers.cloudflare.com/tunnel/advanced/run-parameters/
- Cloudflare Tunnel origin parameters: https://developers.cloudflare.com/tunnel/advanced/origin-parameters/
- Cloudflare Tunnel tokens: https://developers.cloudflare.com/tunnel/advanced/tunnel-tokens/
- Update `cloudflared` with Docker: https://developers.cloudflare.com/tunnel/downloads/update-cloudflared/
- Publish a self-hosted application with Cloudflare Access: https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-apps/
- Portainer HTTPS and self-signed certificate behavior: https://docs.portainer.io/advanced/ssl
- Portainer CLI defaults, including HTTPS on port 9443: https://docs.portainer.io/advanced/cli

## Issues Found
- The original post mixed two different Cloudflare Tunnel management models. It used a locally-managed tunnel workflow (`cloudflared tunnel create`, `config.yml`, and `tunnel route dns`) but then switched to a token-based container example used for remotely-managed tunnels. I corrected the stack example to run the same locally-managed tunnel by mounting the `.cloudflared` directory and running `cloudflared tunnel --no-autoupdate run portainer-tunnel`.
- The original ingress target used `https://localhost:9443` while also deploying `cloudflared` as a separate container. In that setup, `localhost` would point to the `cloudflared` container itself, not Portainer. I changed the origin example to `https://<PORTAINER-HOST-IP>:9443` and added a note explaining that the target must be reachable from the `cloudflared` container.
- The original Cloudflare Access navigation path was outdated. I updated it from `Access -> Applications -> Add application` to `Access controls -> Applications -> Add an application` to match current Cloudflare Zero Trust documentation.
- The prerequisites were slightly underspecified for the DNS routing step. I clarified that the domain must already be added to Cloudflare.

## Review Notes
- Cloudflare currently recommends remotely-managed tunnels for most Docker-based deployments. The corrected post is still technically valid because it now uses the locally-managed workflow consistently from tunnel creation through container runtime.
- The stack example uses `/root/.cloudflared` because the guide's CLI examples imply a root-owned setup. If `cloudflared` was run as a non-root user, the host-side bind mount path should be adjusted accordingly.

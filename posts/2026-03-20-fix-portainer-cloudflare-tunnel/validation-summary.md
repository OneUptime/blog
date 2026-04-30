# Validation Summary: How to Fix Portainer Not Working Behind Cloudflare Tunnel

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Cloudflare Tunnel (`cloudflared`)
- Cloudflare WebSockets
- Cloudflare SSL/TLS
- HTTP/2
- Docker

## Sources Consulted
- Cloudflare Tunnel setup: https://developers.cloudflare.com/tunnel/setup/
- Cloudflare Tunnel origin parameters: https://developers.cloudflare.com/tunnel/advanced/origin-parameters/
- Cloudflare Tunnel configuration file: https://developers.cloudflare.com/tunnel/advanced/local-management/configuration-file/
- Cloudflare WebSockets: https://developers.cloudflare.com/network/websockets/
- Cloudflare HTTP/2: https://developers.cloudflare.com/speed/optimization/protocol/http2/
- Cloudflare SSL/TLS get started: https://developers.cloudflare.com/ssl/get-started/
- Cloudflare connection limits: https://developers.cloudflare.com/fundamentals/reference/connection-limits/
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer reverse proxy guidance: https://docs.portainer.io/advanced/reverse-proxy/nginx
- Portainer FAQ on console timeouts: https://docs.portainer.io/faqs/troubleshooting/logs-errors-and-debugging/why-is-my-console-closing-after-a-certain-time
- Portainer FAQ on re-enabling HTTP: https://docs.portainer.io/faqs/troubleshooting/access-and-authentication/i-enabled-force-https-only-and-now-im-locked-out-of-portainer.-how-do-i-get-back-in

## Issues Found
- The post said Cloudflare Tunnel needed a per-hostname WebSocket setting under the tunnel UI. Current Cloudflare documentation says proxied WebSockets are supported without tunnel-specific configuration, with the relevant control being the zone-level WebSockets setting under **Network**. I updated Step 1 accordingly.
- The `cloudflared` config snippet omitted the required catch-all ingress rule. Cloudflare's configuration-file documentation requires a final catch-all rule such as `http_status:404`, so I added it.
- The config snippet included `noTLSVerify: false` while routing to an HTTP origin. That setting only matters for HTTPS origins, so I removed it to avoid implying it affects plain HTTP.
- The Portainer fix for `Origin invalid` used the wrong flags. `--tunnel-addr` is for the Portainer Edge Agent tunnel listener, while current Portainer CLI documentation says reverse-proxy origin errors should use `--trusted-origins`. I replaced the command with `--trusted-origins portainer.example.com`.
- The SSL/TLS section incorrectly implied that Cloudflare zone mode should be set to `Full` instead of `Full (strict)` because Portainer used self-signed TLS internally. For Tunnel deployments, the local hop to Portainer is controlled by the tunnel `service:` URL and origin parameters, so I rewrote this section to explain the correct boundary.
- The HTTP/2 section treated disabling HTTP/2 as a Portainer-specific per-hostname fix. Current Cloudflare documentation describes HTTP/2 as a zone-level setting and positions disabling it as general troubleshooting, so I corrected that guidance.
- The container-console section claimed a default 100-second Cloudflare WebSocket timeout. Current Cloudflare connection-limit documentation does not support that number, and Portainer's own guidance points to reverse-proxy timeout handling. I replaced the timeout claim with accurate keepalive and proxy-timeout guidance.
- The `wscat` example targeted `/api/websocket`, which is not documented by Portainer as a stable public test endpoint for console access. I replaced it with `cloudflared tunnel ingress rule` plus browser-side verification of the WebSocket upgrade during an actual console session.

## Review Notes
Cloudflare dashboard navigation changes over time between the main dashboard and Zero Trust views, but the corrected settings and behaviors match the current official documentation reviewed on April 30, 2026.

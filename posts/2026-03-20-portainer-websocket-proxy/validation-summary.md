# Validation Summary: How to Fix WebSocket Connection Issues in Portainer Behind a Proxy (2)

## Status
validated

## Post Type
Guide / Troubleshooting tutorial

## Technologies Covered
- Portainer
- Docker
- WebSocket
- Nginx
- Apache HTTP Server
- Traefik
- HAProxy

## Sources Consulted
- Portainer reverse proxy overview: https://docs.portainer.io/advanced/reverse-proxy
- Portainer Traefik reverse proxy guide: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Portainer FAQ on console timeouts behind reverse proxies: https://docs.portainer.io/faqs/troubleshooting/logs-errors-and-debugging/why-is-my-console-closing-after-a-certain-time
- Portainer API access documentation: https://docs.portainer.io/2.21/api/access
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer source for WebSocket routes: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/websocket/handler.go
- Portainer source for exec WebSocket handler requirements: https://raw.githubusercontent.com/portainer/portainer/develop/api/http/handler/websocket/exec.go
- Portainer source for container console URL construction: https://raw.githubusercontent.com/portainer/portainer/develop/app/docker/views/containers/console/containerConsoleController.js
- Portainer source showing container logs polling over HTTP: https://raw.githubusercontent.com/portainer/portainer/develop/app/docker/views/containers/logs/containerLogsController.js
- Portainer source showing container stats polling over HTTP: https://raw.githubusercontent.com/portainer/portainer/develop/app/docker/views/containers/stats/containerStatsController.js
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Apache `mod_proxy_wstunnel` documentation: https://httpd.apache.org/docs/2.4/en/mod/mod_proxy_wstunnel.html
- Traefik WebSocket guide: https://doc.traefik.io/traefik/user-guides/websocket/
- Traefik entryPoints configuration reference: https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/
- HAProxy configuration manual (`timeout tunnel`): https://docs.haproxy.org/2.4/configuration.html

## Issues Found
- The post incorrectly stated that Portainer uses WebSockets for log streaming and live container statistics. I corrected the description, introduction, feature table, and conclusion to scope WebSocket usage to interactive console features such as container console, attach, and Kubernetes shell. Portainer's upstream UI code uses regular HTTP requests and polling for logs and stats.
- The Step 1 `wscat -c wss://portainer.yourdomain.com` example was not a valid Portainer WebSocket test. I removed it because Portainer's console WebSocket is not exposed at `/`; upstream code builds URLs under `/api/websocket/exec` and `/api/websocket/attach`.
- The Step 6 `curl` handshake example was incomplete and would not work as written. I replaced it with an authenticated two-step flow: create an exec session through Portainer's Docker API proxy, then connect to `/api/websocket/exec?endpointId=...&id=...` with `wscat`. The current upstream handler requires authenticated access plus both `endpointId` and `id`.
- The Nginx example included `proxy_buffering off` / `proxy_cache off` with a comment claiming they were required for log streaming. I removed that guidance because it was tied to features that are not WebSocket-based in Portainer's UI, and the official Nginx and Portainer guidance for these console disconnects centers on WebSocket upgrade headers and `proxy_read_timeout`.
- The Traefik static configuration example was in the wrong section. I moved the timeout example from `serversTransport.respondingTimeouts` to the documented `entryPoints.<name>.transport.respondingTimeouts` structure and removed the misleading compression middleware label that did not affect timeout handling.
- The conclusion treated `proxy_http_version 1.1` as universally required. I corrected that to match current Nginx documentation: it is required on older Nginx releases and remains a safe compatibility setting to keep.

## Review Notes
- Apache HTTP Server 2.4.47 and later can handle WebSocket upgrades via `mod_proxy_http`; the post's Apache example remains workable, but it is not the only current approach.
- Traefik supports WebSockets natively, so the main review focus there was correcting the timeout syntax rather than adding special WebSocket headers.
- Portainer's official reverse-proxy examples still use backend port `9000` behind Traefik, even though Portainer API access is commonly documented on external port `9443`.

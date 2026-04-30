# Validation Summary: How to Fix WebSocket Connection Issues in Portainer Behind a Proxy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- WebSocket
- Reverse proxies
- Nginx
- Traefik
- Caddy

## Sources Consulted
- Portainer reverse proxy docs: https://docs.portainer.io/advanced/reverse-proxy
- Portainer reverse proxy with Traefik: https://docs.portainer.io/advanced/reverse-proxy/traefik
- Portainer reverse proxy with Nginx: https://docs.portainer.io/advanced/reverse-proxy/nginx
- Portainer FAQ on console timeouts behind reverse proxies: https://docs.portainer.io/faqs/troubleshooting/logs-errors-and-debugging/why-is-my-console-closing-after-a-certain-time
- Portainer WebSocket handler source: https://github.com/portainer/portainer/blob/develop/api/http/handler/websocket/handler.go
- Portainer exec WebSocket handler source: https://github.com/portainer/portainer/blob/develop/api/http/handler/websocket/exec.go
- Portainer container console frontend source: https://github.com/portainer/portainer/blob/develop/app/docker/views/containers/console/containerConsoleController.js
- Portainer container logs frontend source: https://github.com/portainer/portainer/blob/develop/app/docker/views/containers/logs/containerLogsController.js
- Nginx WebSocket proxying docs: https://nginx.org/en/docs/http/websocket.html
- Nginx `map` module docs: https://nginx.org/en/docs/http/ngx_http_map_module.html
- Traefik WebSocket docs: https://doc.traefik.io/traefik/user-guides/websocket/
- Caddy `reverse_proxy` docs: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- RFC 8441, Bootstrapping WebSockets with HTTP/2: https://datatracker.ietf.org/doc/html/rfc8441

## Issues Found
- The post said Portainer uses WebSockets for both the container console and real-time log streaming. I corrected this because the current Portainer source shows WebSocket handlers for console and shell endpoints, while the container log viewer refreshes logs with repeated HTTP requests rather than a WebSocket connection.
- The post said the proxy must use HTTP/1.1 and not HTTP/2 for the upgrade handshake. I corrected this to make it proxy-specific, because WebSockets over HTTP/2 are standardized in RFC 8441 even though common Nginx upstream proxy configurations still use HTTP/1.1.
- The Nginx snippet used a `map` directive without noting its required context. I added a note that `map` must be placed in the `http` context, which matches Nginx's official directive documentation.
- The Caddy example included an extra `flush_interval -1` directive while also saying no extra WebSocket configuration was needed. I removed the unnecessary directive and left the minimal valid `reverse_proxy` example.
- The `wscat` example targeted `/api/websocket`, which does not match Portainer's current authenticated console endpoints and omitted the required query parameters. I replaced it with an accurate note and kept browser DevTools as the reliable validation method.

## Review Notes
Portainer's current frontend builds console WebSocket URLs under `/api/websocket/exec` and `/api/websocket/attach` with query parameters such as `endpointId` and `id`. Also, current Nginx documentation notes that explicit `proxy_http_version 1.1` was required before Nginx 1.29.7 for the standard WebSocket proxy example, but keeping it explicit in the snippet remains valid.

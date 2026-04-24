# Validation Summary: How to Fix Container Console Not Loading Behind a Reverse Proxy (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine API
- Nginx
- Kubernetes Ingress
- WebSockets

## Sources Consulted
- Portainer API access documentation: https://docs.portainer.io/2.21/api/access
- Portainer reverse proxy documentation: https://docs.portainer.io/advanced/reverse-proxy
- Portainer FAQ on console timeouts behind reverse proxies: https://docs.portainer.io/faqs/troubleshooting/logs-errors-and-debugging/why-is-my-console-closing-after-a-certain-time
- Portainer Kubernetes installation documentation: https://docs.portainer.io/start/install/server/kubernetes/baremetal
- Portainer CE OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Portainer source: `api/http/handler/websocket/exec.go`: https://github.com/portainer/portainer/blob/develop/api/http/handler/websocket/exec.go
- Portainer source: `app/docker/views/containers/console/containerConsoleController.js`: https://github.com/portainer/portainer/blob/develop/app/docker/views/containers/console/containerConsoleController.js
- NGINX WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- NGINX proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Docker Engine API documentation for exec create/start: https://docs.docker.com/reference/api/engine/version/v1.24/
- Ingress-NGINX annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/

## Issues Found
- The post described the console flow too loosely. Portainer first creates an exec instance through the Docker API, then opens `/api/websocket/exec` with both `id` and `endpointId`. I corrected the workflow description to match Portainer's current code path.
- The direct-access troubleshooting step only referenced `http://...:9000`, which is legacy HTTP. Current Portainer defaults to HTTPS on `9443`, so I updated the guidance to mention `9443` first and `9000` as the legacy case.
- The Nginx WebSocket location used `proxy_read_timeout 0` and `proxy_send_timeout 0` while calling that "no timeout". NGINX documents these directives as timeouts between read/write operations, so I replaced them with long explicit values (`3600s`) consistent with Portainer's own reverse-proxy timeout guidance.
- The HTTPS explanation incorrectly implied that an HTTPS frontend requires an HTTPS backend and that Nginx must somehow proxy to `wss://`. I corrected this: the browser uses `wss://` to the reverse proxy when the page is HTTPS, while Nginx upstreams still use `http://` or `https://` depending on how Portainer itself is exposed.
- The command suggested for checking whether Portainer was using HTTP or HTTPS (`docker inspect ... | grep -i "ssl|tls"`) was not a reliable way to determine the active listener. I replaced it with a port/publication check based on `docker ps`.
- The "Test WebSocket Handshake" section did not actually create the exec ID required by `/api/websocket/exec`, and the later `curl` example omitted the required `id` query parameter. I changed Step 6 to create and store `EXEC_ID`, then updated the WebSocket handshake example to use `?endpointId=1&id=$EXEC_ID`.
- The Kubernetes ingress example targeted port `9000` without noting that modern Portainer installs default to HTTPS on `9443`. I updated the example to use `9443` with the `nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"` annotation to match Portainer's current default deployment pattern.
- The conclusion said `proxy_http_version 1.1` is required for WebSocket in Nginx. Current NGINX documentation states HTTP/1.1 is the default upstream proxy protocol since 1.29.7, so I softened this to compatibility guidance instead of a hard requirement.

## Review Notes
- The post is now technically sound for current Portainer releases, but some details remain version-sensitive. In particular, `proxy_http_version 1.1` is still a safe setting to keep for older NGINX releases even though newer NGINX defaults to HTTP/1.1 upstream proxying.

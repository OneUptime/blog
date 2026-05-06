# Validation Summary: How to Choose the Right Shell for Container Console in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- NGINX
- Container shells
- WebSocket proxying

## Sources Consulted
- Portainer docs, "Access a container's console": https://docs.portainer.io/user/docker/containers/console
- Portainer docs, "Why can't I use the console with my container?": https://docs.portainer.io/faqs/troubleshooting/ui-and-features/why-cant-i-use-the-console-with-my-container
- Portainer docs, "View container statistics": https://docs.portainer.io/user/docker/containers/stats
- Portainer docs, "View container logs": https://docs.portainer.io/user/docker/containers/logs
- Portainer docs, "Why is my console closing after a certain time?": https://docs.portainer.io/faqs/troubleshooting/logs-errors-and-debugging/why-is-my-console-closing-after-a-certain-time
- Docker CLI reference, `docker container logs`: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker CLI reference, `docker container exec`: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker CLI reference, `docker container top`: https://docs.docker.com/reference/cli/docker/container/top/
- NGINX docs, "WebSocket proxying": https://nginx.org/en/docs/http/websocket.html
- NGINX docs, `ngx_http_proxy_module`: https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## Issues Found
- The first NGINX snippet used `proxy_set_header X-Accel-Buffering no;` as if it disabled NGINX proxy buffering. The NGINX proxy module docs document `X-Accel-Buffering` as a response header from the upstream, so sending it as a request header with `proxy_set_header` does not disable buffering. I removed that line and kept `proxy_buffering off`, which is the directive that actually disables proxy response buffering.
- The second NGINX snippet used `proxy_set_header Connection $connection_upgrade;` without defining the `map $http_upgrade $connection_upgrade` block that NGINX requires for that variable. I changed the snippet to `proxy_set_header Connection "upgrade";` so the location block is valid as written.
- The post is specifically about choosing the right shell in Portainer, but it omitted the Portainer-documented Alpine `/bin/ash` requirement and the fact that Portainer supports a custom console command. I added a short Portainer-specific note and an `/bin/ash` example.
- I adjusted "log streaming" to "live log access" and "Disk I/O" to "I/O usage" to match the Portainer documentation more closely.

## Review Notes
- The Docker CLI examples for `docker logs`, `docker exec`, and `docker top` are valid against the current Docker CLI reference.
- `docker top` accepts `ps` options from the host environment, so `docker top my-container aux` is common on Linux but option compatibility can vary by host OS and `ps` implementation.
- This review was documentation-based. I did not execute Docker or NGINX commands in this environment.

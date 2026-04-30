# Validation Summary: How to Fix Log Caching Issues with Nginx Reverse Proxy in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Nginx
- Docker CLI
- WebSocket proxying

## Sources Consulted
- Portainer docs, "View a container's details": https://docs.portainer.io/user/docker/containers/view
- Portainer docs, "View container logs": https://docs.portainer.io/user/docker/containers/logs
- Portainer docs, "View container statistics": https://docs.portainer.io/user/docker/containers/stats
- Portainer docs, "Access a container's console": https://docs.portainer.io/sts/user/docker/containers/console
- Portainer docs, "Requirements and prerequisites": https://docs.portainer.io/start/requirements-and-prerequisites
- Docker docs, `docker container logs`: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker docs, `docker container exec`: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker docs, `docker container top`: https://docs.docker.com/reference/cli/docker/container/top/
- Nginx docs, `ngx_http_proxy_module`: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx docs, "WebSocket proxying": https://nginx.org/en/docs/http/websocket.html

## Issues Found
- The log-buffering snippet used `proxy_set_header X-Accel-Buffering no` as if it disabled Nginx response buffering. Nginx documents `X-Accel-Buffering` as a response header from the upstream, while `proxy_set_header` modifies request headers sent to the upstream. I removed that line and left `proxy_buffering off`, which is the directive that actually disables proxy response buffering in this context.
- The WebSocket snippet used `proxy_set_header Connection $connection_upgrade` without defining the required `map $http_upgrade $connection_upgrade { ... }` block at `http` scope. As written, that example was incomplete and could fail config validation. I changed it to `proxy_set_header Connection "upgrade"` so the snippet works as a standalone `location` block.

## Review Notes
- The Docker CLI examples are valid as written against current Docker documentation.
- The Portainer UI navigation and capabilities described in the post are consistent with current Portainer documentation.
- `proxy_http_version 1.1` remains valid for WebSocket proxying, although newer Nginx versions now default upstream proxying to HTTP/1.1.
- `proxy_ssl_verify off` is technically valid for an HTTPS upstream with a self-signed certificate, but it disables upstream certificate verification and should only be used when that tradeoff is acceptable.

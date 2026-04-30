# Validation Summary: How to Follow Container Logs in Real Time in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Docker CLI
- Nginx reverse proxy configuration

## Sources Consulted
- Portainer Documentation: View container logs — https://docs.portainer.io/user/docker/containers/logs
- Portainer Documentation: View container statistics — https://docs.portainer.io/user/docker/containers/stats
- Portainer Documentation: Access a container's console — https://docs.portainer.io/2.33-lts/user/docker/containers/console
- Docker Docs: `docker container logs` — https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs: `docker container exec` — https://docs.docker.com/reference/cli/docker/container/exec/
- Docker Docs: `docker container top` — https://docs.docker.com/reference/cli/docker/container/top/
- Docker Docs: Logs and metrics — https://docs.docker.com/engine/logging/
- nginx documentation: `ngx_http_proxy_module` — https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- nginx documentation: WebSocket proxying — https://nginx.org/en/docs/http/websocket.html

## Issues Found

1. **`proxy_set_header X-Accel-Buffering no;` was incorrect.** In nginx, `proxy_set_header` sets a request header sent upstream, but `X-Accel-Buffering` is documented as a response header that can control proxy buffering. Removed the line and kept `proxy_buffering off;`, which is the correct nginx directive for disabling proxy response buffering in this snippet.

2. **`proxy_set_header Connection $connection_upgrade;` was incomplete as written.** nginx only supports `$connection_upgrade` when it is defined via a `map` block in the `http` context. Because the snippet did not include that `map`, it would not work as shown. Replaced it with `proxy_set_header Connection "upgrade";` to keep the example self-contained and valid.

## Review Notes
- The Docker CLI examples are valid as written for current Docker documentation.
- Per Docker's logging documentation, `docker logs` only shows output available through the container's configured logging driver; if dual logging is disabled for certain drivers, `docker logs` may not show useful output.
- Portainer's official logs documentation describes a Logs view with options such as timestamps, line limits, and auto refresh. The post's Docker CLI examples remain valid for host-side log access and real-time following.

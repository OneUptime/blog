# Validation Summary: How to Troubleshoot Container Logs Not Showing in Portainer - Container

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Portainer
- Docker CLI
- Docker container logs, exec, and process inspection
- Nginx reverse proxy configuration
- WebSocket proxying

## Sources Consulted
- Portainer Docs - View container logs: https://docs.portainer.io/user/docker/containers/logs
- Portainer Docs - View container statistics: https://docs.portainer.io/user/docker/containers/stats
- Portainer Docs - Access a container's console: https://docs.portainer.io/user/docker/containers/console
- Portainer Docs - Deploying Portainer behind nginx reverse proxy: https://docs.portainer.io/advanced/reverse-proxy/nginx
- Docker Docs - docker container logs: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs - docker container exec: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker Docs - docker container top: https://docs.docker.com/reference/cli/docker/container/top/
- Nginx Docs - WebSocket proxying: https://nginx.org/en/docs/http/websocket.html
- Nginx Docs - ngx_http_proxy_module: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- OneUptime homepage: https://oneuptime.com/

## Issues Found
- The Nginx WebSocket snippet used `$connection_upgrade` without defining the `map` that creates that variable. In a standalone Nginx configuration this would fail because the variable is undefined. Added the `map $http_upgrade $connection_upgrade` block and used it in the proxy snippets, matching Nginx's documented WebSocket proxying pattern.
- The reverse proxy buffering snippet used `proxy_set_header X-Accel-Buffering no` with a comment saying it disabled Nginx buffering. `proxy_set_header` sets a request header sent to the upstream service; Nginx response buffering is controlled by `proxy_buffering`, and upstream `X-Accel-Buffering` response headers can be ignored with `proxy_ignore_headers`. Replaced the line with `proxy_ignore_headers X-Accel-Buffering` and kept `proxy_buffering off`.

## Review Notes
- The Docker CLI examples for `docker logs`, `docker exec`, and `docker top` are syntactically valid and match current Docker documentation.
- Portainer's current documentation confirms the container Logs, Stats, and Console views covered by the post.
- `proxy_ssl_verify off` is syntactically valid and can be useful when proxying to a self-signed Portainer HTTPS endpoint, but a production hardening pass should prefer trusted certificates and upstream certificate verification where practical.

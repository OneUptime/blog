# Validation Summary: How to Download Container Logs from Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker CLI
- Nginx reverse proxying
- WebSocket proxying

## Sources Consulted
- Portainer Documentation, View container logs: https://docs.portainer.io/user/docker/containers/logs
- Portainer Documentation, View container statistics: https://docs.portainer.io/user/docker/containers/stats
- Portainer Documentation, Access a container's console: https://docs.portainer.io/sts/user/docker/containers/console
- Docker Docs, `docker container logs`: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs, `docker container exec`: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker Docs, `docker container top`: https://docs.docker.com/reference/cli/docker/container/top/
- NGINX Documentation, WebSocket proxying: https://nginx.org/en/docs/http/websocket.html
- NGINX Documentation, `ngx_http_proxy_module`: https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## Issues Found
- The post title and description said logs were downloaded from Portainer, but the original content only showed Docker CLI commands. I added the documented Portainer workflow: **Containers > [Container Name] > Logs** and **Download logs**, while keeping the Docker CLI examples as a host-access alternative.
- The Portainer stats bullet list used wording that did not match the documented fields closely. I aligned it with Portainer's documented stats categories: CPU usage, memory usage, network usage, I/O usage, and processes running in the container.
- The Nginx buffering snippet used `proxy_set_header X-Accel-Buffering no;` as if it disabled proxy buffering. Per NGINX documentation, `X-Accel-Buffering` is processed as a response header from the upstream; setting it with `proxy_set_header` does not disable buffering. I removed that line and left `proxy_buffering off;`, which is the correct directive here.
- The WebSocket snippet used `proxy_set_header Connection $connection_upgrade;` without defining the required `map $http_upgrade $connection_upgrade` block. I changed it to `proxy_set_header Connection "upgrade";`, which is valid for this location-based WebSocket proxy example.

## Review Notes
- `proxy_ssl_verify off;` is technically valid and is often used when proxying to a local HTTPS upstream with a self-signed certificate, but it weakens TLS verification. A future revision could mention using a trusted certificate instead.
- `proxy_http_version 1.1;` remains correct. NGINX 1.29.7 and later default to HTTP/1.1 for proxying, but keeping the directive explicit preserves compatibility and makes the WebSocket requirement clear.

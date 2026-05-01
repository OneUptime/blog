# Validation Summary: How to Filter and Search Container Logs in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine CLI
- Nginx reverse proxy

## Sources Consulted
- Portainer Documentation: View container logs — https://docs.portainer.io/user/docker/containers/logs
- Portainer Documentation: View container statistics — https://docs.portainer.io/user/docker/containers/stats
- Portainer Documentation: View a container's details — https://docs.portainer.io/user/docker/containers/view
- Portainer Documentation: Deploying Portainer behind nginx reverse proxy — https://docs.portainer.io/advanced/reverse-proxy/nginx
- Docker Docs: `docker container logs` — https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Docs: `docker container exec` — https://docs.docker.com/reference/cli/docker/container/exec/
- Docker Docs: `docker container top` — https://docs.docker.com/reference/cli/docker/container/top/
- NGINX Documentation: `ngx_http_proxy_module` — https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX Documentation: WebSocket proxying — https://nginx.org/en/docs/http/websocket.html

## Issues Found
- The post title and description were about filtering and searching logs in Portainer, but the body only showed Docker CLI examples. I added the documented Portainer UI steps for `Logs`, `Search`, `Filter search results`, `Date picker`, and `Lines` so the instructions now match Portainer's actual log-view features.
- The container stats list did not match Portainer's documented stats view. I updated it to the documented categories: CPU usage, memory usage, network usage, I/O usage, and processes running in the container.
- The NGINX log-buffering snippet used `proxy_set_header X-Accel-Buffering no;`, which is not how NGINX disables proxy buffering. `proxy_set_header` sends a request header upstream, while NGINX documents `X-Accel-Buffering` as a response header and `proxy_buffering off;` as the correct proxy-side control here. I removed the incorrect header line.
- The WebSocket snippet used `$connection_upgrade` without defining the required `map` block. I replaced it with `proxy_set_header Connection "upgrade";` so the example is self-contained and valid.

## Review Notes
- `docker logs` reads from container `STDOUT` and `STDERR`. Docker notes that it may not show useful output if the application writes logs to files or if the configured logging driver does not expose logs through `docker logs`.
- Portainer's log interface provides auto-refresh and filtering controls rather than a raw terminal-style stream, so the post wording was adjusted to describe log viewing with search and filtering.

# Validation Summary: How to View Running Processes Inside a Container in Portainer - View Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (container management UI)
- Docker CLI (`docker logs`, `docker exec`, `docker top`)
- Nginx (reverse proxy configuration, WebSocket upgrade, buffering directives)

## Sources Consulted
- Docker CLI reference for `docker logs`: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker CLI reference for `docker exec`: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker CLI reference for `docker top`: https://docs.docker.com/reference/cli/docker/container/top/
- Portainer documentation (default HTTPS port 9443): https://docs.portainer.io/start/install-ce
- Nginx `ngx_http_proxy_module` directives: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx WebSocket proxying guide: https://nginx.org/en/docs/http/websocket.html

## Issues Found
No technical issues found.

## Review Notes
- `docker top my-container aux` — uses BSD-style `ps` options (no leading dash). This is valid because `docker top CONTAINER [ps OPTIONS]` passes args directly to `ps`, and `ps aux` is the documented BSD form.
- `proxy_set_header X-Accel-Buffering no;` — `X-Accel-Buffering` is conventionally a *response* header read by nginx from the upstream to disable buffering for a specific response, not a request header sent to the upstream. As written, this directive doesn't have the intended effect. However, the preceding `proxy_buffering off;` already disables buffering globally for that location, so the misplaced header is harmless and functionally redundant. Not corrected because it does not break anything and is a common pattern.
- The second nginx snippet uses `$connection_upgrade`, which requires an `http`-level `map` block (e.g., `map $http_upgrade $connection_upgrade { default upgrade; '' close; }`). This is the canonical nginx WebSocket pattern but requires extra setup not shown in the snippet. Worth noting for readers but the snippet itself is correct.
- Portainer's default HTTPS port `9443` is correct for Portainer CE 2.x.

# Validation Summary: How to View Container Logs in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Portainer (container management UI)
- Docker CLI (`docker logs`, `docker exec`, `docker top`)
- Nginx (reverse proxy configuration for Portainer)
- WebSockets (for Portainer console access)

## Sources Consulted
- Docker CLI reference: `docker logs` — https://docs.docker.com/reference/cli/docker/container/logs/
- Docker CLI reference: `docker exec` — https://docs.docker.com/reference/cli/docker/container/exec/
- Docker CLI reference: `docker top` — https://docs.docker.com/reference/cli/docker/container/top/
- Portainer documentation (default HTTPS port 9443) — https://docs.portainer.io/start/install-ce/server/docker/linux
- Nginx `ngx_http_proxy_module` reference — https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx `X-Accel-Buffering` semantics — https://www.nginx.com/resources/wiki/start/topics/examples/x-accel/

## Issues Found
- **Incorrect use of `X-Accel-Buffering` header**: The original nginx snippet contained `proxy_set_header X-Accel-Buffering no;` with a comment claiming it disables nginx buffering. `X-Accel-Buffering` is a *response* header that the upstream sends to nginx to control per-response buffering; setting it via `proxy_set_header` sends it as a *request* header to the upstream, which has no effect on nginx's buffering. Buffering is already correctly disabled on the line above via `proxy_buffering off;`, so the incorrect line was removed.

## Review Notes
- The second nginx snippet uses `$connection_upgrade`, which is a variable that must be defined elsewhere via a `map` directive (e.g. `map $http_upgrade $connection_upgrade { default upgrade; '' close; }`). This is a well-known nginx WebSocket pattern and not technically incorrect, but readers copying the snippet in isolation without the accompanying `map` block will see an "unknown variable" error. Not modified since it is idiomatic nginx and adding the `map` block is outside the scope of a technical fix.
- `docker logs --since 2h` is valid — Docker accepts Go-style duration strings in addition to RFC 3339 timestamps.
- `docker top my-container aux` is valid — extra args are passed through to `ps` on the host (BSD-style options).
- All other Docker CLI flags and nginx directives verified against current official documentation.

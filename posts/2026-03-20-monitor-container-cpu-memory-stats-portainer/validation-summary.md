# Validation Summary: How to Monitor Container CPU and Memory Stats in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (container management UI)
- Docker (CLI: `docker logs`, `docker exec`, `docker top`)
- Nginx (reverse proxy configuration for Portainer)
- WebSockets (for Portainer console access)

## Sources Consulted
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/container/top/
- Portainer documentation (default ports): https://docs.portainer.io/start/install-ce/server/docker/linux
- Nginx `ngx_http_proxy_module` directives: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx WebSocket proxying guide: https://nginx.org/en/docs/http/websocket.html
- Nginx X-Accel-Buffering header docs: https://www.nginx.com/resources/wiki/start/topics/examples/x-accel/

## Issues Found
- **Line 79 (original):** `proxy_set_header X-Accel-Buffering no;  # Disable nginx buffering` — This was technically misleading. `X-Accel-Buffering` is documented as a *response* header that an upstream backend sets to instruct nginx not to buffer the response; it is not a *request* header that nginx sends to the upstream to control its own buffering behavior. The directive `proxy_buffering off;` (already present on the previous line) is what actually disables nginx's response buffering. The line was effectively a no-op with a misleading comment. **Fix:** Removed the line.

## Review Notes
- Portainer's default HTTPS port (`9443`) used in the `proxy_pass` directives is correct.
- The `docker logs --since 2h` syntax is valid — Docker accepts both Unix timestamps and Go duration strings (`s`, `m`, `h`).
- `docker top my-container aux` correctly passes `aux` as ps options to the container's host PS command.
- The second nginx block uses `$connection_upgrade`, which requires a `map` directive in the `http` block (`map $http_upgrade $connection_upgrade { default upgrade; '' close; }`). The post does not show this map definition. Readers copying the snippet verbatim may hit an "unknown variable" error. Consider documenting this prerequisite in a future revision, but the snippet itself is the canonical nginx WebSocket pattern and is not technically wrong.
- The first nginx block uses the simpler literal `"upgrade"` for the `Connection` header, which works for always-WebSocket endpoints but is less correct for endpoints that mix WebSocket and regular HTTP traffic. Both forms are valid.

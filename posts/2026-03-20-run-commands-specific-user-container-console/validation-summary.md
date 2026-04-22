# Validation Summary: How to Run Commands as a Specific User in Container Console - Container Console

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Portainer
- Docker CLI
- Docker containers
- Nginx reverse proxy configuration
- WebSocket proxying

## Sources Consulted
- Docker CLI reference: docker container exec - https://docs.docker.com/reference/cli/docker/container/exec/
- Docker CLI reference: docker container logs - https://docs.docker.com/reference/cli/docker/container/logs/
- Docker CLI reference: docker container top - https://docs.docker.com/reference/cli/docker/container/top/
- Portainer documentation: Access a container's console - https://docs.portainer.io/sts/user/docker/containers/console
- Portainer documentation: View container statistics - https://docs.portainer.io/sts/user/docker/containers/stats
- Portainer documentation: View container logs - https://docs.portainer.io/user/docker/containers/logs
- Portainer documentation: Portainer default HTTPS port - https://docs.portainer.io/2.33-lts/faqs/installing/how-do-i-change-the-port-that-portainer-runs-on
- Nginx documentation: WebSocket proxying - https://nginx.org/en/docs/http/websocket.html
- Nginx documentation: ngx_http_proxy_module - https://nginx.org/en/docs/http/ngx_http_proxy_module.html

## Issues Found
- Removed `proxy_set_header X-Accel-Buffering no;` from the nginx log-streaming snippet. Nginx processes `X-Accel-Buffering` as a response header from the proxied server; setting it as a request header does not disable nginx response buffering. The existing `proxy_buffering off;` directive is the correct local nginx configuration.
- Replaced `proxy_set_header Connection $connection_upgrade;` with `proxy_set_header Connection "upgrade";` in the WebSocket snippet. `$connection_upgrade` is not a built-in nginx variable and only works when defined with a separate `map` block; the standalone snippet did not include that definition.

## Review Notes
The Docker CLI examples for `docker logs`, `docker exec --user`, and `docker top` are current and match the official Docker CLI reference. Portainer's current documentation confirms the container Stats, Logs, and Console pages, including choosing the console command and user before connecting.

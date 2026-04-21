# Validation Summary: How to Troubleshoot 502 Bad Gateway Errors in Nginx with Portainer

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer CE/BE
- Nginx reverse proxy
- Docker containers and Docker networking
- WebSocket proxying
- HTTP 502 Bad Gateway errors
- Linux networking commands

## Sources Consulted
- RFC 9110, HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110.html#name-502-bad-gateway
- Portainer requirements and ports: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer CE Docker installation: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer BE Docker installation: https://docs.portainer.io/start/install/server/docker/linux
- Portainer nginx reverse proxy documentation: https://docs.portainer.io/advanced/reverse-proxy/nginx
- Nginx WebSocket proxying: https://nginx.org/en/docs/http/websocket.html
- Nginx proxy module directives: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Docker CLI reference for container commands: https://docs.docker.com/reference/cli/docker/container/
- Docker network connect reference: https://docs.docker.com/reference/cli/docker/network/connect/
- Docker bridge networking documentation: https://docs.docker.com/engine/network/drivers/bridge/

## Issues Found
- The introduction described a 502 as Nginx being unable to connect to Portainer. RFC 9110 defines 502 more broadly as a proxy receiving an invalid upstream response, so the wording was corrected to say Nginx could not get a valid response from the upstream backend.
- The port guidance implied Portainer CE uses 9000 and Portainer BE uses 9443. Current Portainer docs show both CE and BE expose HTTPS UI/API on 9443 by default, while 9000 is legacy HTTP and may not be published on the host unless configured. The port checks and common-issues bullet were updated.
- The direct connectivity section assumed `localhost:9000` is always valid and that `portainer:9000` can be tested from the host. The commands and explanation were updated to include default HTTPS port 9443, legacy HTTP port 9000, and Docker-network-only hostname resolution.
- The Docker networking section inspected the default `bridge` network while also recommending a `proxy` network. Docker documentation recommends user-defined bridge networks for container-name DNS resolution, so the checks now inspect the proxy network and clarify that the missing container should be connected to the shared network.
- The WebSocket `proxy_read_timeout` value omitted an explicit unit. The value was changed to `86400s` to match Nginx time-value syntax clearly.
- The conclusion listed missing WebSocket headers as a usual 502 cause. Nginx WebSocket headers are required for WebSocket tunneling, but missing them more commonly breaks Portainer features after page load. The conclusion was adjusted accordingly.

## Review Notes
The remaining Docker commands and Nginx directives are syntactically valid. The article still assumes container names `portainer` and `nginx`; users using Docker Compose service names or different container names will need to substitute their actual names.

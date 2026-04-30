# Validation Summary: How to Fix Log Streaming Issues Behind Nginx Reverse Proxy

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Nginx
- Docker Engine API
- curl
- WebSocket reverse proxying

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/api/examples
- Portainer nginx reverse proxy documentation: https://docs.portainer.io/advanced/reverse-proxy/nginx
- Portainer upgrade documentation on default HTTPS/port behavior: https://docs.portainer.io/start/upgrade/docker
- Docker Engine API reference: https://docs.docker.com/reference/api/engine/version/v1.24/
- Docker Engine API version history: https://docs.docker.com/reference/api/engine/version-history/
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- curl man page: https://curl.se/docs/manpage.html
- Official Portainer Agent repository documentation: https://github.com/portainer/agent

## Issues Found
- The introduction said Portainer log streaming uses SSE or WebSocket connections. I changed this to describe Portainer as proxying the Docker HTTP API, because Portainer documents its API as a gateway to Docker and Docker documents container log streaming as a streamed raw HTTP response rather than SSE.
- The buffering explanation said Nginx buffers the entire response and may wait for a "complete" response. I corrected this to match Nginx's documented behavior: Nginx buffers proxied responses, which can delay streamed output, and long-lived streams can also hit `proxy_read_timeout`.
- The direct diagnostic `curl` example omitted authentication. I added the `Authorization: Bearer <your-portainer-api-token>` header because Portainer documents authenticated API calls with a bearer token.
- The Nginx example set `X-Accel-Buffering` as a request header with `proxy_set_header`, but Nginx documents `X-Accel-Buffering` as a response header used by the upstream to control buffering. I removed that incorrect line.
- The WebSocket handling in the "global buffering override" example used `proxy_set_header Connection $http_upgrade`, which can send the wrong `Connection` header value. I corrected the WebSocket configuration to use a dedicated `/api/websocket` location with `Connection "upgrade"` per the official Nginx WebSocket proxying docs.
- The comment labeling `/api/websocket` as being for "real-time logs" was too specific. I updated it to describe the endpoint as a Portainer WebSocket endpoint, which aligns better with Portainer's documented WebSocket console endpoints.

## Review Notes
- The post's upstream examples use `http://portainer:9000`. That is still valid when HTTP is enabled, but recent Portainer installs commonly use HTTPS on `9443` by default, so readers should match the upstream scheme and port to their deployment.
- `curl -N` is appropriate here; curl documents `-N` / `--no-buffer` as disabling stdout buffering so streamed output is shown as it arrives.
- Nginx was not installed in this workspace, so the configuration was validated against the official directive documentation rather than with a local `nginx -t` run.

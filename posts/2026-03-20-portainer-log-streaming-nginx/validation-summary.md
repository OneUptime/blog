# Validation Summary: How to Fix Log Streaming Issues Behind Nginx Reverse Proxy - Portainer

## Status
validated

## Post Type
Guide / troubleshooting tutorial

## Technologies Covered
- Portainer
- Docker Engine
- Nginx reverse proxy
- HTTP streaming
- WebSocket proxying

## Sources Consulted
- Portainer API access docs: https://docs.portainer.io/2.21/api/access
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer reverse proxy docs for nginx: https://docs.portainer.io/sts/advanced/reverse-proxy/nginx
- Portainer agent repository documentation: https://github.com/portainer/agent
- Nginx proxy module reference: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx WebSocket proxying reference: https://nginx.org/en/docs/http/websocket.html
- Nginx core module `keepalive_timeout` reference: https://nginx.org/en/docs/http/ngx_http_core_module.html#keepalive_timeout
- Docker CLI `docker container logs` reference: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker Engine API version history: https://docs.docker.com/reference/api/engine/version-history/

## Issues Found
- The post incorrectly stated that Portainer container log streaming uses WebSocket and that some versions use SSE for logs. I corrected this to describe container logs as a streaming HTTP response exposed through Portainer's API, and limited WebSocket guidance to Portainer console attach/exec endpoints. This matches Portainer's API docs, Portainer agent docs, and Docker log-streaming docs.
- The Nginx examples used `proxy_set_header X-Accel-Buffering no;` as if it disabled Nginx buffering. I removed that because Nginx documents `X-Accel-Buffering` as a response header from the upstream, not a request header to send upstream.
- The timeout section treated `keepalive_timeout` as relevant to active log streaming. I removed that guidance because Nginx documents `keepalive_timeout` as controlling idle keep-alive client connections; `proxy_read_timeout` and `proxy_send_timeout` are the relevant directives here.
- The worker-connections example had two active `worker_connections` directives in the same `events` block, which is invalid configuration. I replaced it with a single valid example.
- The proxy-buffer section suggested `proxy_buffer_size 0`, which is not a valid way to disable proxy buffering. I removed it and kept the correct `proxy_buffering off` guidance.
- The gzip section's "disable only for streaming content types" example did not actually disable compression for Portainer log streams. I simplified it to a valid `gzip off` example.
- The end-to-end test assumed the proxied response must include `Transfer-Encoding: chunked`. I replaced that with a `curl -N` streaming test, because the important validation is continuous streaming behavior rather than one specific response header.

## Review Notes
- Portainer's official documentation still shows some reverse-proxy deployments forwarding to internal port `9000`, while Portainer API access docs describe `9443` as the HTTPS port and `9000` as legacy HTTP. The post now reflects `9443` for direct HTTPS access and notes `9000` as a legacy HTTP case.

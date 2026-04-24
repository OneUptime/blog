# Validation Summary: How to Fix Log Caching Issues with Nginx Reverse Proxy in Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose
- Nginx
- HTTP reverse proxying
- WebSocket proxying

## Sources Consulted
- Portainer reverse proxy documentation: https://docs.portainer.io/sts/advanced/reverse-proxy/nginx
- Portainer container logs documentation: https://docs.portainer.io/user/docker/containers/logs
- Portainer reverse-proxy timeout FAQ: https://docs.portainer.io/sts/faqs/troubleshooting/logs-errors-and-debugging/why-is-my-console-closing-after-a-certain-time
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx headers module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Docker Compose version top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose exec reference: https://docs.docker.com/compose/reference/exec
- Docker Engine API version history: https://docs.docker.com/reference/api/engine/version-history/

## Issues Found
- The post described Portainer log streaming as SSE. I changed this to a generic streaming HTTP response description because the Docker/Portainer log path is documented as a streamed HTTP response, not SSE.
- The post used `proxy_set_header X-Accel-Buffering "no";` as if it disabled Nginx buffering. I corrected this because Nginx documents `X-Accel-Buffering` as an upstream response header, while `proxy_set_header` only sets request headers sent upstream.
- The fine-grained Nginx example also set `X-Accel-Buffering` with `proxy_set_header`. I removed that incorrect line for the same reason.
- The compose example included the top-level `version` field. I removed it because Docker now documents that field as obsolete and only kept for backward compatibility.
- The Nginx example used `listen 443 ssl http2;`. I removed the `http2` parameter because current Nginx documentation marks the `listen ... http2` syntax as deprecated in favor of the `http2` directive, and HTTP/2 was not required for this post.
- The guide suggested `docker exec nginx nginx -s reload` for the Compose deployment. I changed this to `docker compose exec nginx nginx -s reload`, which correctly targets the Compose service without assuming a literal container name of `nginx`.
- The verification section claimed that `Transfer-Encoding: chunked` and no `Content-Length` prove buffering is disabled. I replaced that with behavioral verification, because those headers are not a reliable universal test for streamed responses, especially across different HTTP versions.
- The post presented `proxy_request_buffering off` as part of the fix for delayed log output. I removed that emphasis from the examples and conclusion because the documented issue here is response buffering, controlled by `proxy_buffering`.

## Review Notes
- Portainer's current user documentation refers to log updating as `Auto refresh`; the post uses `Follow` terminology. The underlying troubleshooting guidance remains valid.

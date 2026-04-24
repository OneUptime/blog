# Validation Summary: How to Deploy Nginx via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker Compose / Compose Specification
- Nginx
- HTTP/2
- WebSocket reverse proxying
- TLS/SSL

## Sources Consulted
- Portainer stack deployment docs: https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer relative path volumes docs: https://docs.portainer.io/sts/advanced/relative-paths
- Portainer stack editing docs: https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer container creation docs: https://docs.portainer.io/sts/user/docker/containers/add
- Docker Compose top-level `version` docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose `services` reference (`healthcheck`, `container_name`): https://docs.docker.com/reference/compose-file/services/
- Docker `exec` CLI reference: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker Official Image docs for `nginx`: https://hub.docker.com/_/nginx/
- Nginx core module docs (`listen`, `default_type`, `server_name`): https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx headers module docs (`add_header`): https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx HTTP/2 module docs: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx WebSocket proxying docs: https://nginx.org/en/docs/http/websocket.html
- Nginx Beginner’s Guide (`nginx -s reload` behavior): https://nginx.org/en/docs/beginners_guide.html
- Alpine Linux BusyBox reference (`wget` availability in Alpine-based images): https://wiki.alpinelinux.org/wiki/BusyBox

## Issues Found
- The stack example used relative bind mounts such as `./nginx.conf`. Portainer documents relative path volumes as a Business Edition feature for Git-based stack deployments, so this was misleading for a general Portainer stack example. I changed the bind mounts and host-side file paths to absolute paths under `/opt/portainer/nginx`.
- The Compose example used a top-level `version: "3.8"` field. Docker documents the top-level `version` property as obsolete, so I removed it.
- The `/health` location tried to set the response MIME type with `add_header Content-Type text/plain;`. Nginx documents `add_header` as adding response headers, while `default_type` defines the response MIME type. I changed the health endpoint to use `default_type text/plain;`.
- The TLS server block used `listen 443 ssl http2;`. Nginx documents the `http2` parameter on `listen` as deprecated and recommends the `http2` directive instead. I changed this to `listen 443 ssl;` with `http2 on;`.
- The reload section showed `nginx -s reload` before `nginx -t` even though the comment said to test before reloading. I reordered the commands so configuration testing happens first.

## Review Notes
- `nginx:alpine` is a valid official image tag, but it is a floating tag. Pinning to a specific version would make the deployment more reproducible.
- The healthcheck uses `wget`, which is available in Alpine’s BusyBox-based userland. If the image choice changes away from Alpine, that healthcheck command may need to be adjusted.
- Relative bind mounts can still be used in Portainer when deploying a stack from Git with relative path volumes enabled, but that is not the general default behavior.

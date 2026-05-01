# Validation Summary: How to Deploy Nginx via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Nginx
- Docker
- Docker Compose / Portainer Stacks
- TLS/SSL
- Reverse proxying

## Sources Consulted
- Portainer add container docs: https://docs.portainer.io/2.27/user/docker/containers/add
- Portainer add stack docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer relative path volumes docs: https://docs.portainer.io/advanced/relative-paths
- Docker Compose `version` docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services and volumes docs: https://docs.docker.com/reference/compose-file/services/
- Docker volumes docs: https://docs.docker.com/engine/storage/volumes/
- Docker `exec` docs: https://docs.docker.com/engine/reference/commandline/exec
- NGINX Beginner's Guide: https://nginx.org/en/docs/beginners_guide.html
- NGINX reverse proxy docs: https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy
- NGINX WebSocket proxying docs: https://nginx.org/en/docs/http/websocket.html
- NGINX release notes: https://docs.nginx.com/nginx/releases/
- NGINX HTTP/2 module docs: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Official NGINX Docker image docs: https://hub.docker.com/_/nginx
- Official NGINX Dockerfiles: https://github.com/nginx/docker-nginx/blob/master/mainline/alpine-slim/Dockerfile
- Docker Hub tag metadata for `nginx:alpine`: https://hub.docker.com/v2/repositories/library/nginx/tags/alpine
- Docker Hub tag metadata for `nginx:latest`: https://hub.docker.com/v2/repositories/library/nginx/tags/latest
- Docker Hub tag metadata for `nginx:1.30.0-alpine`: https://hub.docker.com/v2/repositories/library/nginx/tags/1.30.0-alpine

## Issues Found
- The single-container bind mount used `/opt/nginx/conf`, but the later instructions created `/opt/nginx/conf.d/default.conf`. I changed the mount to `/opt/nginx/conf.d` so the mounted path matches the file path used later in the post.
- The single-container example exposed port `443` and the HTTPS configuration expected `/etc/nginx/ssl`, but no SSL bind mount was defined. I added `/opt/nginx/ssl -> /etc/nginx/ssl` so the SSL example can work as written.
- The bind-mounted setup depended on host-side site content and TLS files, but their required host locations were only implied. I made the expected paths explicit for `/opt/nginx/html`, `/opt/nginx/ssl/cert.pem`, and `/opt/nginx/ssl/key.pem`.
- The stack example used relative bind mounts (`./conf.d` and `./ssl`). Portainer documents relative-path support only for Git-based Business Edition deployments with the feature enabled, and Docker documents relative host paths as local-runtime-only. I changed these to absolute host paths under `/opt/nginx`.
- The stack example included the top-level Compose `version` key. Docker documents this field as obsolete and only informative, so I removed it.
- The stack example mounted `/var/log/nginx` to a named volume. The official NGINX Dockerfiles redirect `access.log` and `error.log` to stdout/stderr, so mounting over `/var/log/nginx` would hide those symlinks and conflict with the later instruction to view logs in Portainer. I removed the log volume mount.
- The HTTPS server block used `listen 443 ssl http2;`. NGINX documents the `http2` parameter on `listen` as deprecated, so I changed it to `listen 443 ssl;` plus `http2 on;`.
- The verification section said `docker exec nginx nginx -t` checks whether NGINX is running. That command validates configuration syntax, so I corrected the description.
- The image-size table was outdated. I updated the sizes from current official Docker Hub metadata and refreshed the pinned tag example to `nginx:1.30.0-alpine`.

## Review Notes
- The post is technically sound after the above corrections as of 2026-05-01.
- `nginx:latest` remains a moving tag; a pinned tag is better for reproducible production deployments.
- I verified the content against official documentation and official image metadata. I did not run a live Portainer deployment as part of this review.

# Validation Summary: How to Implement Docker Container Rolling Updates Manually

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine and Docker CLI
- Docker container health checks
- Nginx reverse proxy and HTTP upstream load balancing
- Bash deployment scripts
- Linux `ss` socket inspection

## Sources Consulted
- Docker CLI reference for `docker container run`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker CLI reference for `docker container ls` / `docker ps` filters and formatting: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker CLI local help output for `docker run`, `docker ps`, `docker inspect`, `docker start`, `docker stop`, `docker rm`, and `docker exec` on Docker 29.4.2.
- NGINX HTTP load balancing documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/
- NGINX core `include` directive documentation: https://nginx.org/en/docs/ngx_core_module.html#include
- NGINX process control / reload documentation: https://nginx.org/en/docs/control.html
- Debian `ss(8)` man page for `-H`, TCP state filters, and `dport` / `sport` filtering: https://manpages.debian.org/unstable/iproute2/ss.8.en.html

## Issues Found
- The rolling deployment script removed the old container after shifting traffic, but the rollback script expected a stopped previous container to exist. Changed the deployment script to stop the old container and keep it available for rollback.
- Keeping the stopped old container creates a name conflict on the next blue/green deployment. Added `docker rm "$NEW_NAME" 2>/dev/null || true` before starting the new container so a stopped target slot can be reused.
- The rollback script said it was getting the previous image from Docker history, but it inspected the currently running container image. Updated the comment and variable name to reflect the current image accurately.
- The rollback script claimed to wait for health but only slept for 15 seconds. Replaced the fixed sleep with a Docker health-status wait loop, while allowing containers with no configured health check to proceed.
- The scaled rolling update script pulled no image and also used a fixed sleep while claiming to wait for health. Added `docker pull`, health timeout settings, and a Docker health-status wait loop for each replacement container.
- The connection-draining example counted the `ss` header line and only matched destination port. Updated it to use `ss -H` and match either `dport` or `sport` for the target port.

## Review Notes
- The examples assume the application image contains `curl`; otherwise Docker health checks that call `curl` will fail even if the application is healthy.
- The Nginx container uses host networking, which is Linux-specific behavior and is suitable for the single-server pattern shown here.
- The scripts are intentionally simple examples. Production use should also consider file locking around deployments, atomic upstream file writes, Nginx config testing before reload, and explicit handling for long-lived requests or WebSocket connections.

# Validation Summary: How to Troubleshoot 502 Bad Gateway Errors with Nginx and Portainer

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Nginx Proxy Manager (NPM)
- Nginx (reverse proxy, `proxy_*_timeout`, `proxy_ssl_verify` directives)
- Portainer (CE/BE)
- Docker (CLI: `docker ps`, `docker inspect`, `docker exec`, `docker network`)
- Docker Compose (network configuration)
- jq (JSON parsing in shell)
- HTTP/2 (curl output)

## Sources Consulted
- Nginx Proxy Manager GitHub repository: https://github.com/NginxProxyManager/nginx-proxy-manager (specifically `docker/rootfs/etc/nginx/nginx.conf`, `docker/rootfs/etc/nginx/conf.d/default.conf`, and `backend/templates/*.conf`)
- Portainer official documentation on container ports: https://docs.portainer.io/start/install-ce/server/docker (default ports 9000, 9443, 8000)
- Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html (verifying `proxy_connect_timeout`, `proxy_send_timeout`, `proxy_read_timeout`, `proxy_ssl_verify`)
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/network/connect/

## Issues Found
- **Incorrect Nginx error log path inside NPM container** — The post originally instructed readers to run `docker exec nginx-proxy-manager cat /data/logs/error.log | tail -20`. NPM does not produce a file at `/data/logs/error.log`. The actual log files in NPM are `/data/logs/fallback_error.log` (top-level Nginx errors) and `/data/logs/proxy-host-{id}_error.log` (per-host). I updated the command to `docker exec nginx-proxy-manager sh -c 'tail -20 /data/logs/proxy-host-*_error.log /data/logs/fallback_error.log'`, with a comment noting the per-host file naming convention. Verified against the NPM nginx templates in the official GitHub repo.

## Review Notes
- Portainer's default ports (9000 HTTP, 9443 HTTPS, 8000 Edge Agent tunnel) are correct as of Portainer 2.x. Note that Portainer 2.9+ enables HTTPS on 9443 by default; for newer installations, scheme `https` + port `9443` is increasingly the standard configuration.
- The `docker exec nginx-proxy-manager curl ...` commands work because the NPM image ships with curl preinstalled.
- The `docker-compose.yml` example defines the `proxy` network as project-managed (it will be created automatically). If the network already exists outside the compose project, readers may need to add `external: true` — but as written, the example is valid.
- The Nginx error message strings in the "Common Error Messages" table (`connect() failed (111: Connection refused)`, `(113: No route to host)`, `host not found in upstream`, `upstream timed out (110)`) match the formats produced by Nginx's upstream module.

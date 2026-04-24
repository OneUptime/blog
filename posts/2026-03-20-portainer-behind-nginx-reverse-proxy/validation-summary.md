# Validation Summary: How to Set Up Portainer Behind Nginx Reverse Proxy

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer CE
- Docker Compose
- Docker bridge networking
- Nginx reverse proxy
- TLS/HTTPS
- WebSockets

## Sources Consulted
- Portainer CE install docs: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer reverse proxy docs for nginx: https://docs.portainer.io/advanced/reverse-proxy/nginx
- Portainer release notes: https://docs.portainer.io/sts/release-notes
- Portainer lifecycle policy: https://docs.portainer.io/start/lifecycle
- Docker Compose `version` top-level element docs: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker networking overview: https://docs.docker.com/network
- Docker bridge network tutorial: https://docs.docker.com/engine/network/tutorials/standalone/
- Nginx HTTP/2 module docs: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx WebSocket proxying docs: https://nginx.org/en/docs/http/websocket.html
- Nginx proxy module docs (`proxy_ssl_verify`): https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_ssl_verify

## Issues Found
- Removed the top-level `version: "3.8"` from the Compose example. Docker documents the Compose `version` field as obsolete.
- Updated the Nginx HTTPS server block from `listen 443 ssl http2;` to `listen 443 ssl;` with `http2 on;`. Nginx documents the `listen ... http2` parameter as deprecated in current releases.
- Corrected the Portainer reverse-proxy guidance in Step 3. The original text incorrectly suggested `--http-enabled`, which controls Portainer's HTTP listener and is not the setting used for reverse-proxy origin validation.
- Replaced the incorrect trusted-origins example with `TRUSTED_ORIGINS=portainer.example.com`. Portainer's current trusted-origins support expects domain names, not a full URL such as `https://portainer.example.com`.
- Corrected the troubleshooting note to use a domain value for trusted origins instead of a full URL.

## Review Notes
- The core reverse-proxy pattern is technically valid. Portainer serves HTTPS on port `9443` by default, and containers on the same user-defined bridge network can communicate without publishing Portainer's ports to the host.
- The post still uses `portainer/portainer-ce:latest` and `nginx:latest`. That will work, but Portainer recommends LTS releases for production workloads, so pinning image tags would improve reproducibility.
- If terminal sessions close after being idle behind Nginx, Portainer documents increasing `proxy_read_timeout` on the reverse proxy as a possible follow-up improvement.

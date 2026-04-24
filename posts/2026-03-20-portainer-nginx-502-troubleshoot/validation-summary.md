# Validation Summary: How to Troubleshoot 502 Bad Gateway Errors with Nginx and Portainer (2)

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Portainer
- Nginx
- Nginx Proxy Manager
- Docker CLI
- Docker networking
- HTTP/WebSocket reverse proxying

## Sources Consulted
- Portainer install documentation: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer reverse proxy documentation for nginx: https://docs.portainer.io/advanced/reverse-proxy/nginx
- Portainer Docker update documentation noting `9443` default HTTPS and optional `9000` HTTP retention: https://docs.portainer.io/start/upgrade/docker
- Portainer troubleshooting FAQ for HTTP vs HTTPS on 9443/9000: https://docs.portainer.io/faqs/troubleshooting/client-sent-an-http-request-to-an-https-server
- Docker `docker exec` reference: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker `docker logs` reference: https://docs.docker.com/reference/cli/docker/container/logs/
- Docker `docker ps` / `docker container ls` reference: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker `docker inspect` reference: https://docs.docker.com/reference/cli/docker/inspect/
- Docker `docker network connect` reference: https://docs.docker.com/reference/cli/docker/network/connect/
- Nginx proxy module reference (`proxy_pass`, `proxy_ssl_verify`, `proxy_read_timeout`): https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx core module documentation noting `listen ... http2` deprecation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- RFC 9110, Section 7.6.1 (`Connection` options are case-insensitive): https://datatracker.ietf.org/doc/html/rfc9110#section-7.6.1
- Nginx Proxy Manager source schema for websocket support: https://github.com/NginxProxyManager/nginx-proxy-manager/blob/develop/backend/schema/components/proxy-host-object.json
- Nginx Proxy Manager source template for generated proxy host config: https://github.com/NginxProxyManager/nginx-proxy-manager/blob/develop/backend/templates/proxy_host.conf
- Nginx Proxy Manager source template for generated listen/http2 config: https://github.com/NginxProxyManager/nginx-proxy-manager/blob/develop/backend/templates/_listen.conf

## Issues Found
1. **Outdated Portainer default port/protocol guidance.** The post said Portainer CE defaults to HTTP on port `9000`. Current Portainer documentation says the UI is exposed on `9443` by default with HTTPS, while `9000` is legacy HTTP. I updated the scheme-mismatch guidance, the expected-port notes, and the conclusion to reflect current behavior while still preserving `9000` as a valid legacy/internal reverse-proxy option.
2. **Step 1 relied on in-container tooling that is not guaranteed.** The original check used `docker exec portainer netstat ...` / `ss ...`, but those tools are not part of Docker's documented interface and are not guaranteed to be present in the Portainer image. I replaced that check with `docker inspect` / `docker ps`, which are documented Docker CLI commands and still verify the exposed ports relevant to the troubleshooting flow.
3. **Network connectivity examples were too hard-coded and partially stale.** The original examples assumed a Docker network literally named `proxy`, extracted the IP from that hard-coded network path, and only tested `http://portainer:9000`. I parameterized the proxy container and network names, fixed the `jq` lookup to work with the selected network name, and added connectivity checks for Portainer's default HTTPS listener on `9443` plus the legacy/internal HTTP listener on `9000`.
4. **One WebSocket note was technically incorrect.** The post claimed the `Connection` header "must be lowercase `upgrade`". RFC 9110 says connection options are case-insensitive, so that statement was incorrect. I removed it and updated the example to the conditional `map`-based form documented by Nginx for mixed HTTP/WebSocket proxying.
5. **The standalone Nginx sample used deprecated HTTP/2 syntax.** `listen 443 ssl http2;` is deprecated in current Nginx; the official docs now recommend `listen 443 ssl;` with a separate `http2 on;` directive. I updated the sample accordingly.
6. **The port-conflict check omitted Portainer's current default UI port.** The original `ss` example checked `80`, `443`, and `9000` but not `9443`. I added `9443` so the check covers the current Portainer default as well as legacy HTTP.

## Review Notes
- Portainer's own reverse-proxy docs still show container-to-container reverse proxying to port `9000` in some Docker examples, so `http://portainer:9000` remains valid in deployments that intentionally use Portainer's legacy/internal HTTP listener. The inaccurate part was presenting `9000` as the default current UI endpoint.
- The `proxy_ssl_verify off;` guidance is acceptable for Portainer's default self-signed certificate on `9443`, which Portainer documents. In production, a trusted internal CA and `proxy_ssl_verify on;` with `proxy_ssl_trusted_certificate` would be a stronger long-term setup.
- Nginx Proxy Manager still exposes a `Websockets Support` toggle in its current source and generates the corresponding upgrade headers automatically. Its current templates also use `http2 on;`, which aligns with the Nginx deprecation fix applied to the standalone sample.
- The post does not pin specific Portainer or Nginx versions. The corrections were made against current Portainer docs (2.39 LTS docs family), current Docker CLI docs, and current Nginx reference documentation as available on April 24, 2026.

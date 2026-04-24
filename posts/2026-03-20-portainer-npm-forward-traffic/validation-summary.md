# Validation Summary: How to Configure Nginx Proxy Manager to Forward Traffic to Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Nginx Proxy Manager
- Nginx reverse proxy configuration
- Docker container networking
- curl

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer reverse proxy documentation: https://docs.portainer.io/advanced/reverse-proxy and https://docs.portainer.io/advanced/reverse-proxy/nginx
- Portainer settings documentation for Force HTTPS only: https://docs.portainer.io/admin/settings/general
- Nginx Proxy Manager guide: https://nginxproxymanager.com/guide/
- Nginx Proxy Manager advanced configuration docs: https://nginxproxymanager.com/advanced-config/
- Nginx Proxy Manager proxy template source: https://raw.githubusercontent.com/NginxProxyManager/nginx-proxy-manager/develop/backend/templates/proxy_host.conf
- Nginx Proxy Manager default proxy headers source: https://raw.githubusercontent.com/NginxProxyManager/nginx-proxy-manager/develop/docker/rootfs/etc/nginx/conf.d/include/proxy.conf
- Nginx WebSocket proxying docs: https://nginx.org/en/docs/http/websocket.html
- Nginx proxy module docs: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Docker `network connect` reference: https://docs.docker.com/reference/cli/docker/network/connect/
- Docker `exec` reference: https://docs.docker.com/engine/reference/commandline/exec
- curl option reference via local `curl --help all` (`-I, --head`)

## Issues Found
- The connectivity test assumed the NPM container was literally named `nginx-proxy-manager` and hard-coded one upstream mode. I changed it to use a placeholder container name and clarified that the scheme and port must match the eventual NPM upstream.
- The post described Portainer port `9000` as the default in a way that could mislead readers on current installations. I corrected the wording to say `9000` is the HTTP listener when enabled, and clarified that `9443` should be used when HTTP is disabled.
- The Advanced tab snippet manually added proxy headers and WebSocket directives that Nginx Proxy Manager already injects when WebSocket support is enabled. I removed the redundant directives and kept only the timeout tuning that is actually additive.
- The WebSocket verification step used `curl -I`, which sends a HEAD request and does not perform a WebSocket upgrade handshake. I replaced that with an accurate verification note pointing readers to test through Portainer’s console/exec UI.
- The troubleshooting section said proxying to Portainer on `9443` requires `proxy_ssl_verify off;`. That is inaccurate because nginx does not verify proxied HTTPS server certificates by default. I replaced this with guidance to verify the upstream scheme/port selection and whether Portainer HTTP on `9000` is enabled.
- The Access List explanation for `Satisfy Any: OFF` was too broad. I corrected it to describe the effect when basic auth is also configured.
- The network reconnect example hard-coded a network name of `proxy`. I changed it to a placeholder so the command matches real Docker setups, where network names vary.

## Review Notes
- Portainer’s current documentation shows HTTP on `9000` and HTTPS on `9443` as configurable listeners, with `--http-disabled` available to disable HTTP entirely. On modern installs, `9443` is commonly the externally published port even though `9000` can still be reachable on a shared Docker network.
- If readers encounter Portainer reverse-proxy `Origin invalid` errors, Portainer also documents the `--trusted-origins` option. That is outside the current post’s scope but relevant for some deployments.

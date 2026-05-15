# Validation Summary: How to Set Up Nginx with WebSocket Proxying on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- Nginx
- WebSocket
- HTTP reverse proxying
- TLS termination
- SELinux
- Node.js/npm and wscat
- curl

## Sources Consulted
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Red Hat Enterprise Linux 9 NGINX reverse proxy documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx_deploying-web-servers-and-reverse-proxies
- RFC 6455, The WebSocket Protocol: https://www.rfc-editor.org/rfc/rfc6455
- npm install documentation: https://docs.npmjs.com/cli/v11/commands/npm-install/

## Issues Found
- The load balancing section said `ip_hash` ensures a client always reaches the same backend. Nginx documents that requests from the same client are sent to the same backend except when that backend is unavailable, and backend changes can affect mapping. Updated the wording to say `ip_hash` keeps a client on the same backend while that backend is available, and that a session may be lost on reconnection unless session state is shared.

## Review Notes
- The WebSocket proxy settings match Nginx guidance: explicit `Upgrade` and `Connection` headers are needed because they are hop-by-hop headers, and `proxy_read_timeout` defaults to 60 seconds.
- The explicit `proxy_http_version 1.1` setting is still appropriate for RHEL 9 NGINX versions and remains harmless on newer Nginx releases where HTTP/1.1 proxying is the default.
- The SELinux prerequisite matches Red Hat guidance for allowing NGINX to forward proxied traffic with `httpd_can_network_connect`.

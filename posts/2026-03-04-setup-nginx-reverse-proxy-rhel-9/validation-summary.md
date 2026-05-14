# Validation Summary: How to Set Up Nginx as a Reverse Proxy on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- NGINX
- SELinux
- systemd
- HTTP reverse proxying
- WebSocket proxying

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Deploying web servers and reverse proxies": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx_deploying-web-servers-and-reverse-proxies
- NGINX ngx_http_proxy_module directive reference: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX ngx_http_upstream_module directive reference: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- NGINX documentation, "Serve Static Content": https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/

## Issues Found
No technical issues found.

## Review Notes
The NGINX directives used in the examples are valid in the shown contexts, and the RHEL-specific SELinux boolean matches Red Hat's RHEL 9 reverse proxy documentation. The WebSocket example keeps `proxy_http_version 1.1` explicit, which remains appropriate for RHEL 9 NGINX versions even though newer upstream NGINX releases changed the proxy HTTP version default.

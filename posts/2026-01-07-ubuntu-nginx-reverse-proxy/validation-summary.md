# Validation Summary: How to Set Up a Reverse Proxy with Nginx on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Nginx
- Reverse proxy configuration
- SSL/TLS
- Let's Encrypt
- Certbot
- WebSockets
- Nginx upstream load balancing
- Nginx security headers
- Nginx rate limiting
- UFW
- systemd
- OpenSSL
- curl

## Sources Consulted
- Nginx reverse proxy documentation: https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/
- Nginx `ngx_http_proxy_module` reference: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx upstream module reference: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx HTTP load balancing documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/
- Nginx SSL module reference: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx HTTPS server configuration guide: https://nginx.org/en/docs/http/configuring_https_servers.html
- Nginx headers module reference: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx request rate limiting module reference: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- Ubuntu Server Nginx configuration documentation: https://ubuntu.com/server/docs/how-to/web-services/configure-nginx/
- Certbot Nginx instructions: https://certbot.eff.org/instructions
- Certbot user guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- RFC 6455, The WebSocket Protocol: https://datatracker.ietf.org/doc/html/rfc6455
- Local command help for `ufw`.

## Issues Found
- The Certbot renewal hook section used `/etc/letsencrypt/renewal-hooks/post` and `--post-hook` while describing a script that should run only after a successful renewal. Certbot documents `--deploy-hook` and `/etc/letsencrypt/renewal-hooks/deploy` for successful issuance or renewal hooks, so the section was updated to use deploy hooks.
- The optional cron example used `--post-hook "systemctl reload nginx"`, which can run after renewal attempts rather than only after a certificate is actually renewed. It was changed to `--deploy-hook "systemctl reload nginx"` and clarified as an alternative to the systemd timer.
- The WebSocket curl test used `Sec-WebSocket-Key: test`, which is not a valid RFC 6455 WebSocket key because the decoded value must be 16 bytes. It was replaced with the RFC example value `dGhlIHNhbXBsZSBub25jZQ==`.

## Review Notes
- The `listen 443 ssl http2;` examples are valid for the Ubuntu repository Nginx versions targeted by the post. On newer upstream Nginx releases, `listen ... http2` is deprecated in favor of `listen 443 ssl;` plus `http2 on;`, but that newer directive is not available on older Nginx versions covered by Ubuntu 20.04/22.04/24.04 package baselines.
- Several security headers, especially CSP and cross-origin isolation headers, are application-dependent and may need adjustment for a production application. The post already frames the CSP example as something to modify for application requirements.

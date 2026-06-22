# Validation Summary: How to Install and Configure Nginx as a Web Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (web server, reverse proxy, load balancer)
- Ubuntu (20.04 / 22.04 / 24.04)
- systemd / systemctl service management
- Let's Encrypt / Certbot (TLS certificates)
- TLS/SSL (TLSv1.2, TLSv1.3, HSTS)
- HTTP/2
- PHP-FPM (FastCGI)
- UFW firewall
- Gzip compression

## Sources Consulted
- Nginx official documentation — https://nginx.org/en/docs/
- Nginx `ngx_http_ssl_module` (http2 directive) — https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx `ngx_http_proxy_module` — https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx `ngx_http_upstream_module` (least_conn, weight, backup) — https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx `ngx_http_limit_req_module` — https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- Nginx WebSocket proxying guide — https://nginx.org/en/docs/http/websocket.html
- Certbot documentation — https://eff-certbot.readthedocs.io/
- Ubuntu Nginx packaging / `/etc/nginx` layout — https://ubuntu.com/server/docs
- Mozilla SSL Configuration Generator (cipher/protocol guidance) — https://ssl-config.mozilla.org/

## Issues Found
No technical issues found. The commands, directory layout, server block syntax, SSL/reverse-proxy/load-balancing/rate-limiting configurations, and troubleshooting steps are all syntactically correct and use current, non-deprecated directives.

## Review Notes
- **`http2 on;` directive and Ubuntu repo versions:** The post correctly uses the modern `http2 on;` directive (and the deprecated `listen ... http2` form is rightly avoided). However, `http2 on;` was introduced in Nginx 1.25.1. The Nginx versions in the default Ubuntu repositories for the stated releases are older (20.04: 1.18.0, 22.04: 1.18.0, 24.04: 1.24.0), so this directive will only work on those releases if Nginx is installed from the official Nginx `nginx.org` repository or another up-to-date source. Readers on stock Ubuntu packages older than 1.25.1 would need the legacy `listen 443 ssl http2;` form instead. This is a version caveat, not an error, so it was left unchanged.
- **PHP-FPM socket path/version:** `fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;` is valid (`/var/run` is symlinked to `/run`). The `php8.1` portion matches Ubuntu 22.04's default PHP; readers on 20.04 (PHP 7.4) or 24.04 (PHP 8.3) should adjust the version in both the `fastcgi_pass` line and the `systemctl status php8.1-fpm` troubleshooting command. The post itself targets a range of Ubuntu versions, so this is expected user-adjustable detail.
- **`X-XSS-Protection` header:** Still syntactically valid and commonly included in hardening guides, but modern browsers have largely deprecated it in favor of a strong Content-Security-Policy (which the post also includes). Not incorrect; worth noting for future updates.
- **Bad-bot blocking regex** (`wget|curl|scrapy|bot|spider`) works as written but is broad and can produce false positives (e.g. legitimate crawlers and `bot` substrings). Functionally correct; a stylistic/operational consideration only.

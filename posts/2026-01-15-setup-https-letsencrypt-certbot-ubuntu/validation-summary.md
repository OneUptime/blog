# Validation Summary: How to Set Up HTTPS with Let's Encrypt and Certbot on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Certbot
- Let's Encrypt / ACME
- Apache HTTP Server
- Nginx
- TLS/SSL certificates
- DNS-01 and HTTP-01 validation
- Cloudflare DNS plugin
- OpenSSL
- systemd timers

## Sources Consulted
- Certbot official installation instructions: https://certbot.eff.org/instructions
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- Certbot DNS Cloudflare plugin documentation: https://certbot-dns-cloudflare.readthedocs.io/en/stable/
- Let's Encrypt rate limits: https://letsencrypt.org/docs/rate-limits/
- Let's Encrypt expiration email shutdown notice: https://letsencrypt.org/2025/06/26/expiration-notification-service-has-ended/
- Let's Encrypt certificate lifetime roadmap: https://letsencrypt.org/2025/12/02/from-90-to-45
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Local command help for `ss` and local OpenSSL version output.

## Issues Found
- The setup prompt described the email address as being used for renewal notifications. Let's Encrypt ended certificate expiration notification emails on June 4, 2025, so this was changed to account contact wording.
- The post stated certificates expire after 90 days without qualification. Default Let's Encrypt certificates still use a 90-day lifetime, but shorter profiles are available and default lifetime reductions are planned, so the wording was changed to "default" validity.
- The manual DNS wildcard example omitted the important renewal limitation for `--manual`. Added a note that manual certificates do not support automatic renewal unless authentication hooks are provided, and pointed readers to DNS plugins for automated wildcard renewal.
- The troubleshooting command used `netstat`, which is commonly absent from modern Ubuntu installs unless `net-tools` is installed. Replaced it with `ss`, the current iproute2 tool.
- The permissions fix used recursive `chmod 755` on `/etc/letsencrypt/live` and `/etc/letsencrypt/archive`, which can expose private key material. Replaced it with non-recursive directory permission guidance and group-readable private key permissions for servers that need non-root key access.

## Review Notes
- Certbot's official installation page strongly recommends the snap package for most users, but Ubuntu repository packages and plugin package names used in the post are still plausible for the Ubuntu versions discussed.
- The Nginx sample uses `listen ... http2`, which is valid for Ubuntu repository Nginx versions through Ubuntu 24.04. Upstream Nginx 1.25.1 and newer prefer `http2 on;`, but changing the sample would break older Ubuntu-packaged Nginx versions targeted by this post.

# Validation Summary: How to Configure SSL/TLS Termination in Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx HTTP SSL module
- Nginx HTTP/2 module
- TLS/SSL certificate configuration
- OCSP stapling
- Let's Encrypt
- Certbot
- OpenSSL
- nmap
- curl

## Sources Consulted
- Nginx ngx_http_ssl_module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx ngx_http_v2_module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx changelog for 1.25.1 HTTP/2 directive deprecation: https://nginx.org/en/CHANGES
- Certbot user guide and renewal documentation: https://eff-certbot.readthedocs.io/en/stable/using.html
- Certbot command reference: https://eff-certbot.readthedocs.io/en/stable/man/certbot.html
- Let's Encrypt FAQ: https://letsencrypt.org/docs/faq/
- Let's Encrypt certificate lifetime transition announcement: https://letsencrypt.org/2025/12/02/from-90-to-45
- Local OpenSSL 3.0.13 command verification for public-key hash comparison

## Issues Found
- Updated `listen 443 ssl http2;` examples to use `listen 443 ssl;` plus `http2 on;` because Nginx 1.25.1 deprecated the `http2` parameter on the `listen` directive in favor of the standalone `http2` directive.
- Added `ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;` to the complete server block and clarified the shared OCSP settings comment. Nginx requires trusted issuer/root/intermediate certificates via `ssl_trusted_certificate` for `ssl_stapling_verify on`.
- Changed the private-key matching commands from RSA modulus comparison to public-key SHA-256 comparison. The original `openssl rsa -modulus` approach only works for RSA keys; the replacement works for RSA and ECDSA keys.
- Updated the certificate lifetime wording. Let's Encrypt's default certificates are currently 90 days, but shorter lifetimes are being rolled out starting in 2026, so the original unconditional statement was too broad.

## Review Notes
- The `X-XSS-Protection` header is obsolete in modern browsers, but it does not make the Nginx configuration invalid.
- The cron example is technically valid, though Let's Encrypt recommends routine renewals at randomized times to avoid synchronized traffic spikes. Certbot's packaged systemd timer is usually preferable when available.

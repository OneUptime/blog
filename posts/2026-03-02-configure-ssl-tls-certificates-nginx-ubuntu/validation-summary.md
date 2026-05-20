# Validation Summary: How to Configure SSL/TLS Certificates for Nginx on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Nginx
- Certbot
- Let's Encrypt
- SSL/TLS
- HTTP/2
- OpenSSL
- UFW

## Sources Consulted
- Nginx `ngx_http_ssl_module` documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx `ngx_http_core_module` `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx `ngx_http_v2_module` HTTP/2 documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx SSL termination documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/
- Certbot Ubuntu manpage and plugin documentation: https://manpages.ubuntu.com/manpages/resolute/man7/certbot.7.html
- Certbot Nginx instructions: https://certbot.eff.org/instructions?os=ubuntufocal&ws=nginx
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/
- Let's Encrypt OCSP deprecation announcement: https://letsencrypt.org/2024/12/05/ending-ocsp
- Let's Encrypt certificate lifetime FAQ: https://letsencrypt.org/ca/docs/faq/

## Issues Found
- The SSL parameters snippet enabled OCSP stapling by default for a Let's Encrypt-focused setup. Let's Encrypt removed OCSP URLs from newly issued certificates on May 7, 2025 and ended OCSP service on August 6, 2025, so this is no longer a correct default for Let's Encrypt certificates. I changed the OCSP stapling directives to commented optional settings and noted that they should only be enabled for certificates with an OCSP responder URL.
- The wildcard certificate example used Certbot's `--manual` DNS challenge without noting the renewal limitation. Certbot documentation states manually created certificates do not support automatic renewal unless validation hooks automate the challenge. I updated the comment to make that limitation explicit.
- Several `openssl s_client` commands omitted `-servername yourdomain.com`. Without SNI, checks can return the wrong certificate on virtual-hosted Nginx servers. I added `-servername yourdomain.com` to the relevant commands.
- The HTTP/2 section used `listen 443 ssl http2`, which current Nginx documentation marks as deprecated in favor of the `http2 on;` directive introduced in Nginx 1.25.1. I updated the example to use `listen 443 ssl;` with `http2 on;`.
- The HTTP/2 section said HTTP/2 requires TLS. Nginx can support HTTP/2 without TLS, although browser deployments commonly use it over TLS. I changed the wording to say HTTP/2 is commonly used with TLS.

## Review Notes
- The updated `http2 on;` directive is the current non-deprecated Nginx syntax, but older Ubuntu-packaged Nginx versions before 1.25.1 require the older `listen ... http2` syntax.
- The TLS cipher and protocol settings are syntactically valid Nginx directives. TLS 1.3 cipher suites are not controlled by `ssl_ciphers`; this is acceptable for the guide's scope but could be clarified in a future revision.
- Nginx and Certbot were not installed in the review environment, so local execution of their commands was not possible. OpenSSL was available, and the command flags were verified against official OpenSSL documentation.

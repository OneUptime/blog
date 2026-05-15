# Validation Summary: How to Set Up Nginx with HTTP/2 and TLS 1.3 on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Nginx
- HTTP/2
- TLS 1.3
- OpenSSL
- curl
- nghttp2

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Planning and implementing TLS - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/planning-and-implementing-tls_securing-networks
- Red Hat Enterprise Linux 9 documentation: Deploying web servers and reverse proxies - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deploying_web_servers_and_reverse_proxies/deploying_web_servers_and_reverse_proxies
- Nginx ngx_http_v2_module documentation - https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx ngx_http_ssl_module documentation - https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx ngx_http_headers_module documentation - https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx ngx_http_core_module documentation - https://nginx.org/en/docs/http/ngx_http_core_module.html
- NGINX release notes - https://docs.nginx.com/nginx/releases/
- OpenSSL ciphers command documentation - https://docs.openssl.org/3.0/man1/openssl-ciphers/
- nghttp2 nghttp command documentation - https://nghttp2.org/documentation/nghttp.1.html
- MDN HTTP/2 glossary - https://developer.mozilla.org/en-US/docs/Glossary/HTTP_2

## Issues Found
- The post described HTTP/2 and TLS 1.3 as the "latest" standards. HTTP/2 and TLS 1.3 are modern and widely used, but HTTP/3 also exists, so the wording was changed to "modern standards."
- The post referred broadly to "RHEL" while making RHEL 9-specific OpenSSL claims. The prerequisites and OpenSSL wording were changed to explicitly say RHEL 9.
- The Nginx HTTP/2 example used `listen ... http2`, which is still used in RHEL 9 documentation and older RHEL Nginx streams, but is deprecated in upstream Nginx 1.25.1 and later. A note was added to use `http2 on;` on Nginx 1.25.1 or newer.
- The `ssl_prefer_server_ciphers off;` comment incorrectly said it lets the server choose cipher order. With `off`, client preference is used, so the comment was corrected.
- The TLS cipher comment incorrectly implied TLS 1.3 cipher suites are fixed by the protocol. The comment was changed to clarify that `ssl_ciphers` controls TLS 1.2 and below, not TLS 1.3 cipher suites.
- The optional HTTP/2 server push section used `http2_push`, which is obsolete in current Nginx and unsupported by modern browsers. The section was changed to recommend Link preload headers instead.
- The troubleshooting command `openssl ciphers -v 'TLSv1.3'` is invalid on OpenSSL 3. It was replaced with `openssl ciphers -v -s -tls1_3 2>/dev/null | grep TLSv1.3`.

## Review Notes
RHEL 9 package streams may provide Nginx versions older than upstream 1.25.1, so the older `listen ... http2` syntax can still be the right syntax on stock RHEL 9 systems. For upstream Nginx 1.25.1 or newer, the non-deprecated equivalent is to keep `listen 443 ssl;` and add `http2 on;` in the `server` or `http` context.

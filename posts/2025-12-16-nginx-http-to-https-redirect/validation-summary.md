# Validation Summary: How to Redirect HTTP to HTTPS in Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx HTTP and HTTPS server blocks
- TLS/SSL certificate configuration
- HTTP 301 redirects
- HSTS and HSTS preload
- Reverse proxy headers
- Load balancer and Cloudflare forwarding headers
- curl and OpenSSL testing commands

## Sources Consulted
- Nginx ngx_http_rewrite_module documentation: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- Nginx ngx_http_v2_module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx ngx_http_ssl_module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx ngx_http_headers_module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- HSTS preload requirements: https://hstspreload.org/
- Cloudflare HTTP request headers documentation: https://developers.cloudflare.com/fundamentals/reference/http-headers/
- OWASP HTTP Headers Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
- MDN X-XSS-Protection reference: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- Google Search Central HTTPS ranking signal announcement: https://developers.google.com/search/blog/2014/08/https-as-ranking-signal
- Local OpenSSL help output for `s_client` and `x509`

## Issues Found
- The SEO claim said search engines penalize non-HTTPS websites. Google documents HTTPS as a ranking signal, so the sentence was changed to avoid overstating it as a direct penalty.
- The `listen 80 443 ssl;` examples were not valid Nginx syntax for listening on both HTTP and HTTPS ports. They were changed to separate `listen 80;` and `listen 443 ssl;` directives.
- The production security headers example enabled `X-XSS-Protection` with `1; mode=block`. OWASP and MDN describe this header as deprecated and recommend using CSP instead or disabling legacy XSS filters, so the value was changed to `0`.

## Review Notes
The `http2 on;` examples are current for Nginx 1.25.1 and later, but older Nginx versions used the `http2` parameter on the `listen` directive. The HSTS preload examples meet the current hstspreload.org minimum requirements, though hstspreload.org recommends staged rollout and notes that preloading is not recommended by default. Nginx was not installed in the local environment, so `nginx -t` could not be run.

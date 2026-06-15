# Validation Summary: How to Configure Security Headers in Nginx

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Nginx
- HTTP security headers
- HTTP Strict Transport Security (HSTS)
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- Cache-Control
- curl

## Sources Consulted
- Nginx ngx_http_headers_module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx ngx_http_v2_module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- MDN Strict-Transport-Security header documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security
- MDN X-XSS-Protection header documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- MDN Content-Security-Policy-Report-Only header documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy-Report-Only
- MDN X-Frame-Options header documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options
- MDN Content-Security-Policy frame-ancestors directive documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors
- MDN Permissions-Policy header documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy
- OWASP HTTP Security Response Headers Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html

## Issues Found
- The post used `listen 443 ssl http2;`, which is deprecated in current Nginx configurations. Updated the examples to use `listen 443 ssl;` plus `http2 on;`, matching the current `ngx_http_v2_module` documentation.
- The post recommended `X-XSS-Protection: 1; mode=block` and described it as still useful. Current MDN and OWASP guidance treats `X-XSS-Protection` as deprecated and recommends using CSP instead, with the legacy filter disabled when the header is sent. Updated the examples to `X-XSS-Protection: 0` and adjusted the related descriptions.
- The CSP report-only example used only `report-uri`, which MDN marks as deprecated in favor of `report-to`. Updated the example to include `Reporting-Endpoints` and `report-to`, while keeping `report-uri` as a compatibility fallback.
- The X-Frame-Options example included `ALLOW-FROM`, which modern browsers ignore. Removed that deprecated example and kept the CSP `frame-ancestors` example for allowing specific origins.
- The Nginx header inheritance warning was broadly correct for default behavior, but current Nginx 1.29.3 adds `add_header_inherit merge`. Updated the warning to say "by default" and note the newer merge option.

## Review Notes
The remaining examples are consistent with current Nginx and browser documentation. Nginx was not installed in the local environment, so the Nginx snippets were reviewed against official documentation rather than validated with `nginx -t`.

# Validation Summary: How to Set Up HTTP/2 with Node.js Behind Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx
- Node.js
- Express
- HTTP/2
- TLS / SSL certificates
- Certbot / Let's Encrypt
- OpenSSL
- curl

## Sources Consulted
- Nginx ngx_http_v2_module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx ngx_http_upstream_module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Nginx ngx_http_core_module early_hints documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#early_hints
- Express behind proxies guide: https://expressjs.com/en/guide/behind-proxies/
- Express API reference: https://expressjs.com/en/api/
- Node.js HTTP documentation: https://nodejs.org/api/http.html
- Node.js HTTP/2 documentation: https://nodejs.org/api/http2.html
- curl man page: https://curl.se/docs/manpage.html
- OpenSSL req documentation: https://docs.openssl.org/3.5/man1/openssl-req/
- Certbot Nginx instructions: https://certbot.eff.org/instructions
- Chrome for Developers: Remove HTTP/2 Server Push from Chrome: https://developer.chrome.com/blog/removing-push

## Issues Found
- The introduction listed server push as a current HTTP/2 performance benefit. I changed it to say HTTP/2 introduced server push but that the feature is now largely obsolete in browsers, matching current browser support and the later section of the post.
- The HTTP/2 backend comparison table said TLS is required for HTTP/2 backends. I changed this to "Optional for internal traffic" because HTTP/2 can be used without browser-facing TLS on internal hops, while browsers generally require TLS for HTTP/2.
- The self-signed OpenSSL command created a certificate with only a Common Name. I added `mkdir -p /etc/nginx/ssl` and `-addext "subjectAltName=DNS:localhost,IP:127.0.0.1"` so the command succeeds when the directory is missing and creates a SAN certificate suitable for modern clients.
- The Early Hints snippet used `early_hints on;` and said it required Nginx 1.25.1+. I changed it to Nginx's documented conditional syntax using `early_hints $early_hints;` and updated the version requirement to Nginx 1.29.0+.

## Review Notes
- The `http2 on;` directive is correct for Nginx 1.25.1 and newer. Older Nginx configurations commonly used `listen 443 ssl http2;`, so readers on older distributions may need to adapt that directive.
- The Nginx upstream keepalive settings, proxy headers, WebSocket upgrade headers, Express `trust proxy` usage, curl `--http2` verification, and ALPN verification commands are technically valid.

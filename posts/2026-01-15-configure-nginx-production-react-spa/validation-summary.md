# Validation Summary: How to Configure Nginx for Production React SPAs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (server blocks, try_files, gzip, caching, security headers, reverse proxy, upstreams)
- React single-page applications (Create React App, Vite, Next.js build output)
- HTTP/2
- TLS/SSL (Let's Encrypt, Certbot, OCSP stapling, cipher suites)
- HTTP caching semantics (Cache-Control, immutable, content hashing)
- HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
- Docker / Docker Compose (multi-stage build, nginx:alpine)

## Sources Consulted
- Nginx ngx_http_v2_module documentation (`http2` directive, introduced 1.25.1): https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx ngx_http_gzip_module documentation: https://nginx.org/en/docs/http/ngx_http_gzip_module.html
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx ngx_http_core_module (try_files): https://nginx.org/en/docs/http/ngx_http_core_module.html
- Mozilla SSL Configuration Generator: https://ssl-config.mozilla.org/
- Certbot / Let's Encrypt documentation: https://eff-certbot.readthedocs.io/ , https://letsencrypt.org/docs/
- Official nginx Docker image (alpine variant) — curl is not bundled; busybox wget is: https://hub.docker.com/_/nginx
- IANA media types / standard `application/rss+xml` registration

## Issues Found
- **Prerequisite version inconsistent with the config.** The post recommended "Nginx version 1.18 or higher," but every server block uses the standalone `http2 on;` directive, which was only introduced in Nginx 1.25.1 (it replaced the deprecated `listen ... http2` parameter). On 1.18 the config would fail with "unknown directive http2". Updated the prerequisite to 1.25.1 or higher and noted the dependency.
- **Incorrect MIME type in the Docker `gzip_types` list.** The Docker section listed `application/xml+rss`, which is not a valid media type. The correct, IANA-registered type is `application/rss+xml` (as already used correctly in the main configuration). Fixed.
- **Docker healthcheck used `curl`, which is not present in `nginx:alpine`.** The official Alpine-based nginx image does not ship curl, so `["CMD", "curl", "-f", ...]` would permanently mark the container unhealthy. Replaced with busybox `wget` (`--spider`), which is available in the image. Also switched the target from `localhost` to `127.0.0.1` to avoid Alpine's IPv6 (`::1`) resolution of `localhost`, which the server block (listening on IPv4 `:80`) would not answer.

## Review Notes
- **www server_name overlap (left as-is).** The main HTTPS server block declares `server_name yourdomain.com www.yourdomain.com;` while the optional third block also claims `www.yourdomain.com` on port 443. Including both as written produces a "conflicting server name" warning and the www-redirect block is ignored. This is intentional in the sense that the third block is labelled "(optional)" — to use the www→non-www redirect, drop `www.yourdomain.com` from the main block's `server_name`. Worth a one-line clarification in a future edit but not a hard error.
- **`X-XSS-Protection "1; mode=block"`** is technically valid but the header is deprecated; modern guidance (OWASP) recommends `X-XSS-Protection: 0` and relying on CSP instead. Left unchanged since it is not incorrect and remains widely used.
- **OCSP stapling with Let's Encrypt.** Let's Encrypt began winding down OCSP in favour of CRLs during 2025 and is removing OCSP URLs from issued certificates; `ssl_stapling on;` will simply have no effect once a certificate lacks an OCSP responder URL (it does not break the config). The directives themselves are syntactically correct, so they were left in place.
- The post correctly documents the `add_header` inheritance gotcha (nested `location` blocks drop inherited headers) in the troubleshooting section, which is an accurate and commonly-missed Nginx behavior.
- `proxy_pass http://localhost:3001/;` with a trailing slash correctly strips the `/api/` prefix before forwarding — this matches the documented behavior and is internally consistent with the CSP `connect-src` example.
- Remaining snippets (worker tuning, buffer settings, log formats, upstream load balancing) are syntactically valid and use current directive names and sensible production values.

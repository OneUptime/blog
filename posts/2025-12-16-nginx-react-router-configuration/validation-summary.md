# Validation Summary: How to Configure React Router with Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx
- React
- React Router
- Docker
- Docker Compose
- Single Page Applications
- HTTP caching and compression

## Sources Consulted
- Nginx core module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx headers module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx sub module documentation: https://nginx.org/en/docs/http/ngx_http_sub_module.html
- Nginx gzip static module documentation: https://nginx.org/en/docs/http/ngx_http_gzip_static_module.html
- Nginx serving static content guide: https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/
- Nginx changelog for HTTP/2 directive deprecation: https://nginx.org/en/CHANGES
- React Router BrowserRouter documentation: https://reactrouter.com/api/declarative-routers/BrowserRouter
- React Router declarative routing documentation: https://reactrouter.com/start/declarative/routing
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Nginx official Docker image documentation: https://hub.docker.com/_/nginx
- Nginx Brotli module documentation: https://docs.nginx.com/nginx/admin-guide/dynamic-modules/brotli/

## Issues Found
- The production Nginx example used `listen 443 ssl http2;`, which is deprecated in current Nginx. Changed it to `listen 443 ssl;` plus `http2 on;`.
- The production security headers included the obsolete `X-XSS-Protection` header. Replaced it with `Referrer-Policy`.
- The micro-frontend examples used `/admin` and `/dashboard` prefix locations without trailing-slash redirects. Changed them to `/admin/` and `/dashboard/` locations and added exact redirects for the bare paths.
- The custom 404 example claimed to handle truly missing files, but the SPA fallback would serve `index.html` for missing asset-like paths. Added a file-extension location that returns a real 404 for missing assets.
- The Docker Compose example used the obsolete top-level `version` field. Removed it.
- The runtime environment section mixed Nginx `sub_filter` with environment-variable substitution. Reworked it so `config.js.template` uses `envsubst` placeholders and Nginx serves the generated `config.js` without long-term caching.
- The common issue about API requests said prefix location order matters. Updated the explanation because Nginx prefix locations are selected by matching rules, not simple declaration order.

## Review Notes
Representative Nginx snippets for API proxying, micro-frontend routing, custom 404 handling, and runtime config serving were syntax-tested with `nginx -t` using the official `nginx:alpine` Docker image, which reported Nginx 1.31.1. The TLS production snippet was checked against official Nginx documentation; local syntax testing with real certificate paths was not completed because the container lacked certificate-generation tooling.

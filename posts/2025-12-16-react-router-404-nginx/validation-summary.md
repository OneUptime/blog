# Validation Summary: How to Fix React Router 404 Errors in Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React
- React Router
- Nginx
- Docker
- Node.js
- npm
- curl

## Sources Consulted
- Nginx ngx_http_core_module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx ngx_http_v2_module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx static content guide: https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/
- React Router BrowserRouter documentation: https://reactrouter.com/api/declarative-routers/BrowserRouter
- React Router HashRouter documentation: https://reactrouter.com/api/declarative-routers/HashRouter
- React Router changelog / v8 notes: https://reactrouter.com/changelog
- Docker multi-stage build documentation: https://docs.docker.com/build/building/multi-stage/
- Node.js releases documentation: https://nodejs.org/en/about/previous-releases
- npm ci documentation: https://docs.npmjs.com/cli/v9/commands/npm-ci/

## Issues Found
- Updated Nginx HTTPS examples from `listen 443 ssl http2;` to `listen 443 ssl;` with `http2 on;` because the `listen ... http2` parameter is deprecated in current Nginx, and the official HTTP/2 module documentation now shows `http2 on;`.
- Updated the Docker build image from `node:18-alpine` to `node:24-alpine` because Node.js 18 is end-of-life and Node.js production applications should use an Active LTS or Maintenance LTS release.
- Updated React Router imports from `react-router-dom` to `react-router` because current React Router documentation uses `react-router`, and React Router v8 removed the `react-router-dom` re-export package.
- Corrected the API location explanation. Nginx prefix location matching uses the longest matching prefix, so `/api/` is selected over `/` regardless of their order among prefix locations. The post now says to define API locations explicitly rather than claiming order alone controls this behavior.
- Corrected the static-file fallback example. `try_files $uri $uri/ /index.html` still returns `index.html` for missing static files unless static locations are handled explicitly with a `=404` fallback.
- Corrected subdirectory and multiple-app `alias` examples to use trailing-slash locations and aliases, plus exact redirects from `/myapp` to `/myapp/` and `/admin` to `/admin/`, matching Nginx `alias` behavior more reliably.

## Review Notes
Verified representative Nginx configurations with `nginx -t` using the official `nginx:alpine` Docker image. The post is technically relevant and remains a valid SPA deployment guide after the corrections.

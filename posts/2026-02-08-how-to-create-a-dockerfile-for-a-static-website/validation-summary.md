# Validation Summary: How to Create a Dockerfile for a Static Website

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile
- Docker Compose
- Nginx
- Apache HTTP Server
- Node.js
- npm
- Vite-based React builds
- Hugo
- Next.js static export

## Sources Consulted
- Docker Dockerfile reference: https://docs.docker.com/reference/builder
- Docker multi-stage builds documentation: https://docs.docker.com/build/building/multi-stage/
- Docker build context and .dockerignore documentation: https://docs.docker.com/build/building/context/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Hub Nginx Official Image documentation: https://hub.docker.com/_/nginx
- Docker Hub Node Official Image documentation: https://hub.docker.com/_/node
- Node.js Release Working Group schedule: https://github.com/nodejs/release
- npm ci documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- NGINX compression documentation: https://docs.nginx.com/nginx/admin-guide/web-server/compression/
- NGINX static content and try_files documentation: https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/
- NGINX headers module documentation: https://nginx.org/r/expires
- Apache .htaccess tutorial: https://httpd.apache.org/docs/current/howto/htaccess.html
- Apache core AllowOverride documentation: https://httpd.apache.org/docs/2.4/mod/core.html#allowoverride
- Apache mod_deflate documentation: https://httpd.apache.org/docs/current/mod/mod_deflate.html
- Apache mod_expires documentation: https://httpd.apache.org/docs/current/mod/mod_expires.html
- Vite build output documentation: https://vite.dev/config/build-options.html
- React Create React App deprecation notice: https://react.dev/blog/2025/02/14/sunsetting-create-react-app
- Next.js static export documentation: https://nextjs.org/docs/app/guides/static-exports
- Hugo command documentation: https://gohugo.io/commands/hugo/

## Issues Found
- The post described Next.js generically as a static site generator. Updated the wording to "a statically exported Next.js app" because standard Next.js deployments are not always static exports.
- The React multi-stage example used `node:20-alpine`, but Node.js 20 reached end-of-life on 2026-04-30. Updated it to `node:24-alpine`, which is an active LTS line.
- The React example copied `/app/build`, which matches older Create React App output. Since Create React App is deprecated and the example now targets Vite-based React apps, updated the output path to `/app/dist`.
- The Apache Dockerfile copied `.htaccess` but did not enable overrides for the Apache document root. Added a scoped `sed` expression to set `AllowOverride All` only in the `/usr/local/apache2/htdocs` directory block so the `.htaccess` directives are read.
- The post quoted stale exact image sizes for `nginx` and `nginx:alpine`. Replaced those numbers with relative wording because current image sizes vary by tag, platform, and Docker's compressed versus local image-size reporting.

## Review Notes
- Verified the edited Nginx configuration with `nginx -t` in `nginx:alpine`.
- Verified the edited Apache configuration with `httpd -t` in `httpd:2.4-alpine`.
- Verified that `node:24-alpine` resolves and runs Node v24.
- The Nginx non-root example depends on the separate `nginx-nonroot.conf` listening on a non-privileged port and using writable paths; the post correctly states the port requirement but does not include the full config.

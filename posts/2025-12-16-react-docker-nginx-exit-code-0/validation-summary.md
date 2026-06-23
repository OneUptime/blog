# Validation Summary: How to Fix React App Exiting with Code 0 in Docker with Nginx

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- React static builds
- Docker and Dockerfile instructions
- Docker Compose
- Nginx
- npm
- Node.js container images

## Sources Consulted
- Dockerfile reference: CMD, ENTRYPOINT, and HEALTHCHECK instructions: https://docs.docker.com/reference/dockerfile/
- Docker run reference for overriding commands and entrypoints: https://docs.docker.com/engine/containers/run/
- Docker Compose file reference and Compose Specification: https://docs.docker.com/reference/compose-file/
- Official Nginx Docker image Dockerfile showing inherited ENTRYPOINT and foreground CMD: https://github.com/nginx/docker-nginx/blob/master/stable/alpine-slim/Dockerfile
- Nginx core module documentation for the `daemon` directive: https://nginx.org/en/docs/ngx_core_module.html#daemon
- Nginx gzip module documentation: https://nginx.org/en/docs/http/ngx_http_gzip_module.html
- Nginx headers module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- npm `ci` command documentation: https://docs.npmjs.com/cli/v9/commands/npm-ci/
- Node.js official release schedule: https://nodejs.org/en/about/previous-releases
- Create React App environment variable documentation: https://create-react-app.dev/docs/adding-custom-environment-variables/

## Issues Found
- The post claimed that a Dockerfile based on `nginx:alpine` without an explicit `CMD` would exit immediately. The official Nginx image already provides an `ENTRYPOINT` and `CMD ["nginx", "-g", "daemon off;"]`, so inheriting that image without overriding `CMD` is not the broken case. I changed the broken examples to show the actual failure mode: overriding the inherited foreground command with `CMD ["nginx"]`, which allows Nginx to daemonize and lets the container's main process finish.
- Several build-stage examples used `npm ci --only=production`. React build tools are commonly in `devDependencies`, and the build stage needs those dependencies to run `npm run build`. I changed those build-stage installs to `npm ci` or `npm ci --silent`.
- The examples used Node 18 images. Node.js 18 is end-of-life as of the current review date, while Node 24 is listed as LTS by the official Node.js release schedule. I updated the examples to `node:24` / `node:24-alpine`.
- The Docker Compose example used the legacy top-level `version: '3.8'` field. Current Docker Compose uses the Compose Specification, and legacy 2.x/3.x formats have been merged into it. I removed the `version` field from the example.
- The "daemon mode" mistake suggested using `daemon off;` in `nginx.conf` as an alternative while the Docker examples also pass `-g "daemon off;"`. To avoid duplicate/conflicting daemon directives, I changed the guidance to remove `daemon on;` from the config and keep `daemon off` in the Docker `CMD`.
- The interactive debugging command overrode only the entrypoint. Because Docker still supplies the image `CMD` as arguments unless a replacement command is provided, I added `-l` after the image name so the shell command replaces the default Nginx `CMD`.

## Review Notes
- The Nginx `try_files` SPA fallback, gzip directives, cache headers, Docker health checks, `ENTRYPOINT` script pattern, and debugging commands are technically plausible.
- The `REACT_APP_` environment variable examples match Create React App conventions. Other React tooling may use different prefixes or build-time environment handling, such as Vite's `VITE_` prefix.

# Validation Summary: How to Containerize an Angular Application with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Angular CLI
- Docker
- Docker Compose
- Dockerfile multi-stage builds
- Nginx
- Node.js and npm

## Sources Consulted
- Angular CLI `ng new` documentation: https://angular.dev/cli/new
- Angular CLI build documentation: https://angular.dev/tools/cli/build
- Angular version compatibility: https://angular.dev/reference/versions
- Angular environments generator documentation: https://angular.dev/cli/generate/environments
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Hub Nginx official image documentation: https://hub.docker.com/_/nginx
- Docker Hub Nginx unprivileged image documentation: https://hub.docker.com/r/nginxinc/nginx-unprivileged
- Node.js End-of-Life documentation: https://nodejs.org/en/about/eol
- Nginx `try_files` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files
- Local Docker CLI checks for Docker, Docker Compose, and `nginx:1.25-alpine` behavior.

## Issues Found
- The prerequisites and Dockerfile examples used Node.js 18+/20. Current actively supported Angular versions require newer Node.js ranges, and Node.js 20 is listed as end-of-life by Node.js. Updated the prerequisite to Node.js 22.22+ or 24.15+ and changed Dockerfile examples from `node:20-alpine` to `node:24-alpine`.
- The prerequisites listed Docker Engine 20.10+ but the commands use `docker compose`, which requires Docker Compose v2. Updated the prerequisite to require Docker Engine with Docker Compose v2.
- The production Nginx examples pinned `nginx:1.25-alpine`, while the official Nginx image now publishes newer stable Alpine tags. Updated the examples to use `nginx:stable-alpine`.
- The Docker Compose examples used top-level `version: "3.8"`, which the current Compose specification marks as obsolete and only informative. Removed the `version` field from both Compose snippets.
- The Compose health check used `curl`. The current Nginx official image is documented as a minimal image, so relying on extra common packages is less portable. Updated the health check to use a shell command with `wget -q --spider`.
- The build-time environment variable example targeted `src/environments/environment.prod.ts`, but current Angular environment generation uses `environment.ts` as the default production environment file. Updated the example to mention `ng generate environments` and replace `src/environments/environment.ts`.
- The non-root Nginx example manually created a user on the official Nginx image. Updated it to use the Nginx unprivileged image, switch the custom server block to port 8080, and preserve the final non-root runtime user.

## Review Notes
The remaining Docker, Angular CLI, Nginx SPA fallback, `.dockerignore`, and `docker build`/`docker run` examples are technically valid. The article still uses build-time API URL substitution, which is correct for Angular's compiled static output but should not be used for secrets because frontend bundles are visible to users.

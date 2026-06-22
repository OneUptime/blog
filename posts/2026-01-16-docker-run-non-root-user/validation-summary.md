# Validation Summary: How to Run Docker Containers as Non-Root Users

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile
- Docker Compose
- Kubernetes securityContext
- NGINX containers
- Node.js / npm
- Alpine Linux
- Python containers
- Ubuntu containers

## Sources Consulted
- Docker Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker `docker run` CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker `docker exec` CLI reference: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose `up` CLI reference: https://docs.docker.com/reference/cli/docker/compose/up/
- Kubernetes security context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- NGINX unprivileged Docker image documentation: https://github.com/nginx/docker-nginx-unprivileged
- Node.js release/EOL documentation: https://nodejs.org/en/about/eol and https://nodejs.org/en/about/previous-releases
- npm `ci` command documentation: https://docs.npmjs.com/cli/v9/commands/npm-ci/
- Alpine Linux release documentation: https://alpinelinux.org/releases/
- Ubuntu release cycle documentation: https://ubuntu.com/about/release-cycle
- Python version status documentation: https://devguide.python.org/versions/

## Issues Found
- The post stated "Root in container = root on host." This was too absolute. Updated it to explain that container root can make escape impact worse, especially with permissive capabilities or host mounts.
- Examples used `node:18-slim`, but Node.js 18 is end-of-life. Updated Node.js examples to `node:24-slim`.
- The Alpine example used `alpine:3.19`, which is outdated. Updated it to `alpine:3.24`.
- npm examples used `npm ci --only=production`. Updated them to the current `npm ci --omit=dev` form.
- Docker Compose examples included the obsolete top-level `version: '3.8'` field. Removed it.
- Commands used the legacy `docker-compose` executable. Updated commands to `docker compose`.
- The NGINX port section said non-root users cannot bind below port 1024. This is runtime-dependent in modern container environments. Updated the explanation to mention `CAP_NET_BIND_SERVICE` and recommend higher ports for portability.
- The NGINX non-root example was incomplete for official NGINX images because NGINX also needs writable PID/temp paths or an unprivileged image configuration. Updated the Dockerfile to use `nginxinc/nginx-unprivileged:alpine` and replaced the invalid `...` NGINX config placeholder with a syntactically valid server block.
- The verification section implied `docker exec -u root` should fail for a properly configured Docker container. Docker's CLI supports `--user` for `exec`, so this is not a reliable Docker enforcement test. Updated the section to clarify that Kubernetes `runAsNonRoot` is the enforcement case.
- The final Dockerfile used `curl` in `HEALTHCHECK` without installing it in the production image. Added installation of `curl` and `ca-certificates`.

## Review Notes
- The remaining examples are intentionally generic and still require application-specific files such as `package.json`, `server.js`, `requirements.txt`, or `start.sh`.
- Python 3.11 and Ubuntu 22.04 are still within their support windows as of 2026-06-22, but future refreshes should update base image versions as their lifecycles change.

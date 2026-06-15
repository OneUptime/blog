# Validation Summary: How to Use Docker Entrypoint vs CMD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile `ENTRYPOINT` and `CMD`
- Docker CLI
- Docker Compose
- Shell scripts
- Python container images
- Node.js/npm container builds
- Nginx container configuration

## Sources Consulted
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker build best practices: https://docs.docker.com/build/building/best-practices/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker CLI `docker run`, `docker inspect`, and `docker exec` local help output
- Docker Compose CLI local help output
- npm `ci` documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- npm `ci` local help output

## Issues Found
- The shell-form example did not explicitly state that shell-form `ENTRYPOINT` ignores `CMD` and runtime arguments. Added a comment to match Docker's documented behavior.
- The wrapper-script Dockerfile used `nc` in the entrypoint script but did not install it in `python:3.11-slim`. Added installation of `netcat-openbsd` with apt cache cleanup.
- The Node.js Dockerfile used `npm ci --only=production`. Replaced it with the current documented `npm ci --omit=dev` option.
- The nginx templating example copied `nginx.conf` but the script read `/etc/nginx/nginx.conf.template`. Changed the Dockerfile to copy `nginx.conf.template` to the path used by the script.

## Review Notes
The remaining Dockerfile, Docker CLI, and Compose examples align with Docker's documented `ENTRYPOINT`/`CMD` interaction. One caveat for future improvement: examples that use host networking with `docker run --network host` are Linux-oriented and may behave differently on Docker Desktop depending on platform support and settings.

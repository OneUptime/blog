# Validation Summary: How to Optimize Docker Image Size with Multi-Stage Builds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile multi-stage builds
- Docker BuildKit
- Docker Scout
- Node.js and npm
- Go
- Python virtual environments
- Alpine Linux

## Sources Consulted
- Docker Docs: Multi-stage builds, including named stages, `--target`, external images, and BuildKit behavior: https://docs.docker.com/build/building/multi-stage/
- Docker Docs: Dockerfile reference for `FROM`, `ARG`, `COPY`, `CMD`, `ENTRYPOINT`, `USER`, and `WORKDIR`: https://docs.docker.com/reference/dockerfile/
- Docker Docs: BuildKit concurrent build graph solver: https://docs.docker.com/build/buildkit/
- Docker Docs: Build cache optimization and layer ordering: https://docs.docker.com/build/cache/optimize/
- Docker CLI reference: `docker buildx build` / `docker build --target`: https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker CLI reference: `docker image ls` / `docker images`: https://docs.docker.com/reference/cli/docker/image/ls/
- Docker CLI reference: `docker image history`: https://docs.docker.com/reference/cli/docker/image/history/
- Docker CLI reference: `docker scout cves`: https://docs.docker.com/reference/cli/docker/scout/cves/
- npm Docs: `npm ci` and `--omit=dev`: https://docs.npmjs.com/cli/commands/npm-ci/
- npm Docs: npm config `only` deprecation in favor of `--omit=dev`: https://docs.npmjs.com/cli/v8/using-npm/config#only
- Node.js official release schedule / previous releases: https://nodejs.org/en/about/previous-releases
- Go release notes for current Go 1.26 release: https://go.dev/doc/go1.26
- Go cgo documentation for `CGO_ENABLED`: https://pkg.go.dev/cmd/cgo
- Python Docs: `venv` virtual environments: https://docs.python.org/3/library/venv.html

## Issues Found
- The Node.js examples used `node:20` and `node:20-alpine`. Node.js 20 is EOL as of 2026, so the examples were updated to `node:24` and `node:24-alpine`, which is an active LTS line.
- The production npm install used `npm ci --only=production`. npm documents `only=production` as deprecated in favor of omitting dev dependencies, so this was changed to `npm ci --omit=dev`.
- The Go examples used `golang:1.22-alpine`. Go 1.22 is no longer current or supported, so the examples were updated to `golang:1.26-alpine`.
- The "Using Build Arguments" section actually demonstrated Docker build targets, not build arguments. The heading and introductory sentence were corrected to describe build targets.
- The build-target example copied `node_modules` from the builder stage after installing all dependencies, which would put dev dependencies into the production target. The production target now runs `npm ci --omit=dev` and copies only the built `dist` output from the builder.
- The external image example copied only the nginx binary into Alpine, which is misleading because a dynamically linked nginx runtime requires additional files and libraries. The example now follows Docker's documented pattern of copying a file from an external image.

## Review Notes
The remaining examples are intentionally generic and assume typical project files such as `package-lock.json`, `go.mod`, `go.sum`, `requirements.txt`, and application entry points exist. The Python example is technically valid for packages that need PostgreSQL client libraries, but projects with different native dependencies should substitute the corresponding runtime libraries.

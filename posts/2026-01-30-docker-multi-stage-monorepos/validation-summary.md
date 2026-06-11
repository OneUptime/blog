# Validation Summary: How to Build Multi-Stage Dockerfiles for Monorepos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker and Dockerfile multi-stage builds
- Docker BuildKit cache mounts
- pnpm workspaces and pnpm deploy
- Node.js container images
- Go modules and Go workspaces
- Docker Compose
- GitHub Actions CI
- dorny/paths-filter
- docker/build-push-action

## Sources Consulted
- Docker Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker multi-stage builds documentation: https://docs.docker.com/build/building/multi-stage/
- Docker build cache optimization documentation: https://docs.docker.com/build/cache/optimize/
- Docker GitHub Actions cache documentation: https://docs.docker.com/build/ci/github-actions/cache/
- Docker Compose Build Specification: https://docs.docker.com/reference/compose-file/build/
- pnpm deploy documentation: https://pnpm.io/cli/deploy
- Go modules reference: https://go.dev/ref/mod
- Go workspace tutorial: https://go.dev/doc/tutorial/workspaces
- Go release policy: https://go.dev/doc/devel/release
- Node.js release schedule and EOL documentation: https://nodejs.org/en/about/previous-releases and https://nodejs.org/en/about/eol
- dorny/paths-filter repository and Marketplace listing: https://github.com/dorny/paths-filter and https://github.com/marketplace/actions/paths-changes-filter
- Docker build-push-action current usage in Docker docs: https://docs.docker.com/build/ci/github-actions/cache/
- GitHub actions/checkout repository: https://github.com/actions/checkout

## Issues Found
- The Docker examples used `node:20-alpine`, but Node.js 20 is EOL as of the 2026 review date. Updated examples to `node:24-alpine`, the current LTS line.
- The Corepack example used `corepack prepare pnpm@latest --activate` while claiming consistent package manager versions. Replaced it with `corepack enable` and clarified that consistency comes from pinning the package manager in root `package.json`.
- The manual production pnpm install example omitted `pnpm-workspace.yaml`, which is needed for workspace-aware installs. Added the workspace file to the copied metadata.
- The pnpm deploy command used an option order that did not match pnpm's documented usage and omitted the current `inject-workspace-packages` requirement. Updated the command to `pnpm --filter "api" --prod deploy /deployed/api` and added a short caveat about `inject-workspace-packages=true` or `--legacy`.
- The cache optimization example used `COPY **/package.json ./`, which would not preserve each workspace manifest's directory structure. Replaced it with explicit manifest `COPY` instructions matching the rest of the post.
- The selective build example declared `ARG SERVICE` only before `FROM`; Docker ARG scope requires redeclaring it inside later stages before using it in `COPY` and `RUN`. Added `ARG SERVICE` to the service build stage.
- The Go section said Go compiles to static binaries in general. Narrowed this to "can compile services to static binaries" because static output depends on build settings such as `CGO_ENABLED=0`.
- The Go builder image used the outdated `golang:1.22-alpine` tag. Updated it to `golang:1.26-alpine` based on Go's supported-release policy as of the review date.
- The CI example used older major versions for `dorny/paths-filter` and `docker/build-push-action`. Updated them to `dorny/paths-filter@v4` and `docker/build-push-action@v7` based on current upstream documentation.

## Review Notes
The examples remain intentionally generic and assume workspace package names such as `api`, `worker`, and `gateway` match the actual `name` fields in each service's `package.json`. The Docker Compose snippet is structurally valid, but real local development usually also needs database credentials, health checks, and development-oriented targets rather than production targets.

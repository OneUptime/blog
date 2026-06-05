# Validation Summary: How to Reduce Docker Image Size for Node.js Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker and Dockerfiles
- Node.js official Docker images
- npm and `npm ci`
- Multi-stage Docker builds
- Alpine Linux images
- BuildKit cache mounts
- `.dockerignore`
- esbuild
- node-prune

## Sources Consulted
- Node.js Release Working Group schedule: https://github.com/nodejs/release
- Node.js Docker official image README: https://github.com/nodejs/docker-node/blob/main/README.md
- Node.js Docker best practices: https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker build context and `.dockerignore` documentation: https://docs.docker.com/build/concepts/context/
- npm `ci` documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- esbuild API documentation: https://esbuild.github.io/api/
- node-prune package documentation: https://pkg.go.dev/github.com/tj/node-prune
- Local CLI help for Docker 29.4.2 and npm 10.9.4

## Issues Found
- The examples used `node:20`, but Node.js 20 reached end-of-life on 2026-04-30. Updated the Dockerfile snippets and size comparison labels to `node:24`, which is an Active LTS line on the validation date.
- The final production Dockerfile installed `dumb-init` after switching to `USER appuser`, which would make `apk add --no-cache dumb-init` fail because package installation requires root. Moved the `apk add` command before the `USER appuser` instruction.
- The esbuild example marked `sharp` and `bcrypt` as external while the final stage copied no `node_modules`, so applications importing those packages would fail at runtime. Removed the external flags from the fully bundled example and left the native-module caveat in the explanatory text.
- The manual cleanup step removed `LICENSE*` files from dependencies. Removed that deletion from the example so the pruning advice does not strip dependency license files.

## Review Notes
The size numbers are presented as typical examples and can vary by architecture, Docker image rebuild date, package tree, and whether Docker reports compressed or local image size. Local image-pull verification was blocked by Docker Hub unauthenticated pull rate limits, so image tag and lifecycle checks were verified against official Node.js and Node Docker image documentation instead.

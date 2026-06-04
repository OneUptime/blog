# Validation Summary: How to Structure a Monorepo with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker Buildx Bake
- Docker BuildKit
- Dockerfile build contexts
- .dockerignore files
- npm workspaces
- Node.js container builds
- CI/CD changed-service builds

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker build context documentation: https://docs.docker.com/build/concepts/context/
- Docker build cache optimization documentation: https://docs.docker.com/build/cache/optimize/
- Docker Buildx Bake CLI reference: https://docs.docker.com/reference/cli/docker/buildx/bake/
- npm workspaces documentation: https://docs.npmjs.com/cli/v10/using-npm/workspaces/
- npm ci documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- Local CLI checks with Docker 29.4.2, Docker Compose v5.1.3, Docker Buildx v0.33.0, and npm 10.9.4.

## Issues Found
- The Compose examples used `version: "3.8"`. The current Compose Specification treats the top-level `version` property as obsolete and Docker Compose warns that it is ignored. Removed the `version` lines from both Compose snippets.
- The Buildx Bake example used `--set "*.tags=myregistry/*:v1.2.3"`. Buildx applies the wildcard to the target pattern, but the tag value remains literal, producing `myregistry/*:v1.2.3` for every target. Replaced it with explicit per-target tag overrides.
- The post claimed Docker `1.20+` supports Dockerfile-specific `.dockerignore` files. That version statement is inaccurate and unnecessary. Replaced it with a current BuildKit-backed-builds statement.

## Review Notes
The remaining examples and explanations are technically sound for npm workspaces and modern Docker/BuildKit workflows. The sample Dockerfiles assume the root `package.json` defines matching npm workspaces and that each package has the referenced `build`, `dev`, and `test` scripts.

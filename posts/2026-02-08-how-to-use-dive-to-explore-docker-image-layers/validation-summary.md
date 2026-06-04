# Validation Summary: How to Use Dive to Explore Docker Image Layers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker images and layers
- Dive
- GitHub Actions
- Dockerfile multi-stage builds
- Node.js / npm
- `.dockerignore`

## Sources Consulted
- Dive README and official upstream repository: https://github.com/wagoodman/dive
- Dive CI option source: https://github.com/wagoodman/dive/blob/main/cmd/dive/cli/internal/options/ci.go
- Dive CI rules source: https://github.com/wagoodman/dive/blob/main/cmd/dive/cli/internal/command/ci/rules.go
- Dive sample CI config: https://github.com/wagoodman/dive/blob/main/.data/.dive-ci
- Docker image layers documentation: https://docs.docker.com/get-started/docker-concepts/building-images/understanding-image-layers/
- Docker multi-stage build documentation: https://docs.docker.com/build/building/multi-stage/
- Docker build context and `.dockerignore` documentation: https://docs.docker.com/build/building/context/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- npm `npm ci` documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- npm `npm prune` documentation: https://docs.npmjs.com/cli/commands/npm-prune/

## Issues Found
- The Dive keyboard shortcut list incorrectly described `Ctrl+A` as toggling only added/modified files and omitted `Ctrl+M`. Updated the shortcut descriptions to match Dive's official key bindings for layer view and filetree view.
- The `.dive-ci` example used a bare numeric value for `highestWastedBytes`. Updated it to `20MB`, matching Dive's documented human-readable byte format examples.
- The Node.js Dockerfile examples used npm's older `--production` form. Updated the production install and prune examples to `--omit=dev`, which is the current npm option documented for omitting development dependencies.

## Review Notes
The post is technically relevant and the remaining Dive, Docker, GitHub Actions, multi-stage build, and `.dockerignore` examples are consistent with the consulted upstream documentation. The Dive project notes that Go-installed builds may not report a proper version with `dive --version`, but the install command itself remains valid.

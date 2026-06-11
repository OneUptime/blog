# Validation Summary: How to Create Docker Multi-Platform Manifests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Buildx
- Docker multi-platform images and manifest lists
- Dockerfile platform build arguments
- Docker CLI manifest commands
- Docker Hub
- GitHub Container Registry
- Amazon ECR
- Azure Container Registry
- GitHub Actions
- GitLab CI
- QEMU/binfmt emulation
- npm

## Sources Consulted
- Docker Docs: Multi-platform builds - https://docs.docker.com/build/building/multi-platform/
- Docker Docs: docker buildx build CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: docker buildx create CLI reference - https://docs.docker.com/reference/cli/docker/buildx/create/
- Docker Docs: Dockerfile reference, automatic platform ARGs and FROM --platform - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Build variables - https://docs.docker.com/build/building/variables/
- Docker Docs: docker manifest command reference - https://docs.docker.com/reference/cli/docker/manifest/
- Docker Docs: docker manifest create - https://docs.docker.com/reference/cli/docker/manifest/create/
- Docker Docs: docker manifest annotate - https://docs.docker.com/reference/cli/docker/manifest/annotate/
- Docker Docs: docker manifest push - https://docs.docker.com/reference/cli/docker/manifest/push/
- Docker Docs: Multi-platform image with GitHub Actions - https://docs.docker.com/build/ci/github-actions/multi-platform/
- Docker Docs: Manage tags and labels with GitHub Actions - https://docs.docker.com/build/ci/github-actions/manage-tags-labels/
- Docker login-action documentation - https://github.com/docker/login-action
- AWS ECR private registry authentication - https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Azure Container Registry authentication - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication
- GitHub Docs: Working with the Container registry - https://docs.github.com/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- npm Docs: npm ci and omit configuration - https://docs.npmjs.com/cli/v9/commands/npm-ci/
- npm Docs: npm config deprecations for only/production - https://docs.npmjs.com/cli/v8/using-npm/config/

## Issues Found
- The post stated that `--push` is required because multi-platform images cannot be loaded into the local Docker image store directly. Docker's current documentation says the default Docker image store cannot load multi-platform images, but the containerd image store can be enabled for local loading. Updated the explanation and summary takeaway to include this distinction.
- The Node.js Dockerfile examples used `npm ci --only=production`. npm documents `only=production` as deprecated in favor of `--omit=dev`. Updated both examples to `npm ci --omit=dev`.
- The Amazon ECR example used a 9-digit account ID placeholder (`123456789`). AWS ECR registry URIs use a 12-digit AWS account ID. Updated the example URI to `123456789012.dkr.ecr.us-east-1.amazonaws.com`.
- The GitHub Actions example used older major versions of Docker-maintained actions. Updated Docker actions to the current versions shown in Docker's official docs: `docker/setup-qemu-action@v4`, `docker/setup-buildx-action@v4`, `docker/login-action@v4`, `docker/metadata-action@v6`, and `docker/build-push-action@v7`.
- The native multi-node Buildx example did not show distinct Docker contexts/endpoints for the AMD64 and ARM64 nodes, so both commands could attach to the same current endpoint. Updated the commands to use assumed Docker contexts named `node-amd64` and `node-arm64`, matching Docker's documented multi-node pattern.

## Review Notes
- The `docker manifest` command family is still marked experimental in Docker's CLI reference, but the commands and flags shown are valid.
- The `FROM --platform=$TARGETPLATFORM` Node.js examples are technically valid, though Docker's default behavior already uses the target platform for `FROM` unless overridden.
- The GitLab CI example is syntactically plausible as a folded YAML scalar, but a block scalar (`|-`) would be clearer in a future style pass.

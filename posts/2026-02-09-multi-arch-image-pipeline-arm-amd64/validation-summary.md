# Validation Summary: How to Build a Multi-Architecture Container Image Pipeline for Kubernetes ARM

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Docker Buildx and BuildKit
- Docker multi-platform images and manifest lists
- Dockerfiles for Go and Node.js applications
- GitHub Actions
- GitLab CI/CD
- Tekton Pipelines and Buildah
- jq and kubectl

## Sources Consulted
- Docker Docs: Multi-platform builds - https://docs.docker.com/build/building/multi-platform/
- Docker Docs: Dockerfile reference, automatic platform ARGs - https://docs.docker.com/reference/builder/
- Docker Docs: docker buildx build reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: docker manifest reference - https://docs.docker.com/reference/cli/docker/manifest/
- Docker Docs: GitHub Actions with Docker - https://docs.docker.com/build/ci/github-actions/
- GitHub: docker/build-push-action - https://github.com/docker/build-push-action
- GitHub: docker/setup-buildx-action releases - https://github.com/docker/setup-buildx-action/releases
- GitHub: docker/login-action - https://github.com/docker/login-action
- GitHub: actions/checkout - https://github.com/actions/checkout
- GitLab Docs: Build Docker images with BuildKit - https://docs.gitlab.com/ci/docker/using_buildkit/
- Kubernetes Docs: Node labels populated by the kubelet - https://kubernetes.io/docs/reference/node/node-labels/
- Tekton Docs: Pipeline API - https://tekton.dev/docs/pipelines/pipeline-api/
- Artifact Hub: Tekton Buildah task parameters - https://artifacthub.io/packages/tekton-task/tekton-catalog-tasks/buildah
- npm Docs: npm ci - https://docs.npmjs.com/cli/commands/npm-ci/
- Node.js Release Working Group schedule - https://github.com/nodejs/Release
- Go release history - https://go.dev/doc/devel/release

## Issues Found
- The Buildx setup command created a builder without explicitly selecting the `docker-container` driver. Updated it to use `--driver docker-container`, matching Docker's documented multi-platform builder setup.
- The Node Dockerfile declared `TARGETARCH` only before `FROM`, which makes it unavailable inside the build stage for `RUN` commands. Redeclared `ARG TARGETARCH` after `FROM`.
- The Node example used `node:18-alpine`, which is EOL as of this review date, and `npm ci --only=production`, which npm now warns against in favor of omit flags. Updated to `node:24-alpine` and `npm ci --omit=dev`.
- The Go examples used `golang:1.21`, which is outdated as of this review date. Updated examples to `golang:1.26`.
- The GitHub Actions examples used old action major versions. Updated Docker and checkout actions to current documented major versions where applicable.
- The GitLab CI example omitted the current Docker-in-Docker TLS variable, used `docker:latest` instead of `docker:cli`, and did not bootstrap a `docker-container` Buildx builder. Updated it to match GitLab's documented Buildx pattern.
- The native ARM build example built images in separate jobs but did not push them before the manifest job referenced them. Added pushes and registry login steps.
- The Kubernetes pod architecture check incorrectly reported `.status.hostIP` as the architecture. Replaced it with a command that reads each pod's node and fetches the node's `kubernetes.io/arch` label.
- The build-time optimization Go Dockerfile pinned the build stage to `$BUILDPLATFORM` but did not cross-compile for `$TARGETOS` and `$TARGETARCH`. Added the required build arguments and `GOOS`/`GOARCH` settings.

## Review Notes
- The Tekton `create-multiarch-manifest` task is referenced as a task name and would need to exist in the target cluster as a custom or catalog task. The Tekton Pipeline structure and Buildah task parameter names were otherwise consistent with the referenced APIs.
- Registry examples use `registry.example.com`; real workflows must provide matching registry credentials and image names.

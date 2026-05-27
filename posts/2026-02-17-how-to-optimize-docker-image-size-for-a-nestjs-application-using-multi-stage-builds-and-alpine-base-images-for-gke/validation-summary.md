# Validation Summary: How to Optimize Docker Image Size for a NestJS App Using Multi-Stage Builds and

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker multi-stage builds
- Dockerfile and .dockerignore
- Node.js
- npm
- NestJS
- Alpine Linux
- Kubernetes and GKE
- Google Cloud Artifact Registry
- Google Cloud Build

## Sources Consulted
- Docker Docs: Multi-stage builds: https://docs.docker.com/build/building/multi-stage/
- Docker Docs: Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Docs: Build context and .dockerignore: https://docs.docker.com/build/building/context/
- Docker Hub: Official Node image documentation: https://hub.docker.com/_/node
- npm Docs: npm ci: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- npm Docs: npm prune: https://docs.npmjs.com/cli/v11/commands/npm-prune/
- NestJS Docs: Controllers: https://docs.nestjs.com/controllers
- NestJS Docs: Lifecycle events and shutdown hooks: https://docs.nestjs.com/fundamentals/lifecycle-events
- Kubernetes Docs: Liveness, readiness, and startup probes: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Google Cloud Docs: Cloud Build substitutions: https://cloud.google.com/build/docs/configuring-builds/substitute-variable-values
- Google Cloud Docs: Configure Cloud Build for Artifact Registry: https://cloud.google.com/artifact-registry/docs/configure-cloud-build

## Issues Found
- The Dockerfile examples used `npm prune --production`. This still works, but current npm emits a warning recommending `--omit=dev` instead. Updated both examples to `npm prune --omit=dev`, matching the current npm documentation and CLI help.

## Review Notes
The Docker, NestJS, Kubernetes, Artifact Registry, and Cloud Build examples are technically valid. Image size numbers are approximate and can vary by CPU architecture, package graph, native dependencies, and the current Node image digest. Alpine-based Node images are smaller, but projects with native modules should still test musl libc compatibility before standardizing on Alpine.

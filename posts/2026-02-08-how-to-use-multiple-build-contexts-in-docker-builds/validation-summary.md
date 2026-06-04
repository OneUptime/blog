# Validation Summary: How to Use Multiple Build Contexts in Docker Builds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker BuildKit
- Docker Buildx
- Dockerfile `COPY --from`
- Docker build contexts and named contexts
- Docker Compose build configuration
- `.dockerignore`

## Sources Consulted
- Docker Docs: `docker buildx build` CLI reference, including `--build-context`: https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker Docs: Build context and named contexts: https://docs.docker.com/build/concepts/context/
- Docker Docs: Dockerfile reference for `COPY --from`: https://docs.docker.com/reference/dockerfile/
- Docker Docs: Compose Build Specification for `additional_contexts`: https://docs.docker.com/reference/compose-file/build/
- Docker Docs: Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Local CLI output: `docker buildx build --help`

## Issues Found
- The monorepo command used `--build-context shared=../../shared` while also using `./services/api` as the main context, which only works from a different working directory than the command implies. Changed the named context to `./shared` and clarified that `services/api` is the main context.
- The tools-image example copied `/usr/bin/curl` from `alpine/curl` into `alpine:3.19` without copying or installing curl's runtime libraries, so the binary might not run. Changed it to a self-contained binary from a custom tools image.
- The Docker Compose example used the obsolete top-level `version: "3.9"` field. Removed it and added the official Docker Compose 2.17.0+ requirement for `additional_contexts`.
- The `.dockerignore` guidance implied every context type has a context directory. Clarified that the advice applies to local directory and Git contexts.

## Review Notes
- The main BuildKit, Buildx, named context, image context, Git context, stage override, Dockerfile `COPY --from`, and Compose `additional_contexts` explanations match current Docker documentation.
- Docker's official docs also show named contexts can be used with `RUN --mount=from=...`; the post focuses on `COPY --from`, which is technically correct for the examples shown.

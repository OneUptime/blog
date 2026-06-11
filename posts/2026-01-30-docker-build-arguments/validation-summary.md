# Validation Summary: How to Build Docker Images with Build Arguments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile `ARG` and `ENV` instructions
- Docker BuildKit and Buildx
- Multi-stage Docker builds
- Build secrets
- GitHub Actions
- GitLab CI
- Go cross-compilation

## Sources Consulted
- Docker Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Build variables documentation: https://docs.docker.com/build/building/variables/
- Docker Build secrets documentation: https://docs.docker.com/build/building/secrets/
- Docker provenance attestations documentation: https://docs.docker.com/build/metadata/attestations/slsa-provenance/
- Docker Build GitHub Actions documentation: https://docs.docker.com/build/ci/github-actions/
- Docker build-push-action README: https://github.com/docker/build-push-action
- Docker build-push-action Marketplace listing: https://github.com/marketplace/actions/build-and-push-docker-images
- Local Docker CLI help: `docker build --help`, `docker buildx build --help`, `docker buildx imagetools inspect --help`

## Issues Found
- The "With Default Values" Dockerfile declared `ENVIRONMENT` before `FROM` and used it in a `RUN` instruction without redeclaring it in the stage. Docker global `ARG` values are not automatically available after `FROM`, so the value would expand as empty. Moved `ARG ENVIRONMENT=production` after the `FROM` instruction.
- The simple Dockerfile example and the `ARG` to `ENV` conversion example were incomplete as standalone Dockerfile snippets because they omitted a `FROM` instruction. Added minimal `FROM` lines so the examples are syntactically valid.
- The stage-scoping explanation said `ARG`s do not carry over between stages without qualification. Docker does inherit build arguments into child stages based on the stage where the argument was declared or consumed. Updated the wording to refer to unrelated stages.
- The security section said build arguments are visible in build logs unconditionally and showed `docker buildx imagetools inspect myimage` as "Inspect build cache." Docker documents build arguments as visible in image history and provenance attestations, while logs expose them when commands print or otherwise reveal them. Updated the wording and changed the command comment to inspect image provenance attestations.
- The GitHub Actions example used `docker/build-push-action@v5`. The current official Docker documentation and Marketplace listing use v7, so the example was updated to `docker/build-push-action@v7`.

## Review Notes
- The remaining Docker build commands and flags (`--build-arg`, `--secret`, `--platform`, `-t`) match current Docker CLI help.
- The cross-platform example correctly redeclares `TARGETOS` and `TARGETARCH` inside the build stage before using them.
- The post correctly warns against passing secrets via build arguments and points readers toward BuildKit secret mounts.

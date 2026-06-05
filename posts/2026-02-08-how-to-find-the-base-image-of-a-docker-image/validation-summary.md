# Validation Summary: How to Find the Base Image of a Docker Image

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile
- Docker CLI
- Docker Scout
- Docker Hub Registry API
- OCI image annotations
- Bash
- jq
- Dive

## Sources Consulted
- Docker Docs: Base images - https://docs.docker.com/build/building/base-images/
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/dockerfile/
- Docker Docs: docker image history - https://docs.docker.com/reference/cli/docker/image/history/
- Docker Docs: docker inspect - https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: docker image inspect / RootFS layer examples - https://docs.docker.com/engine/storage/drivers/
- Docker Docs: docker scout recommendations - https://docs.docker.com/reference/cli/docker/scout/recommendations/
- Docker Docs: docker manifest - https://docs.docker.com/reference/cli/docker/manifest/
- CNCF Distribution: HTTP API V2 - https://distribution.github.io/distribution/spec/api/
- Open Container Initiative image-spec annotations - https://github.com/opencontainers/image-spec/blob/main/annotations.md
- Open Container Initiative image-spec config - https://github.com/opencontainers/image-spec/blob/main/config.md
- Dive GitHub repository - https://github.com/wagoodman/dive
- Linked OneUptime Dive article - https://oneuptime.com/blog/post/2026-02-08-how-to-use-dive-to-explore-docker-image-layers/view
- Local CLI help: `docker history --help`, `docker inspect --help`, `docker build --help`

## Issues Found
- The introduction claimed every Docker image builds on another image. Updated this to "Most Docker images" because Docker supports `FROM scratch` for minimal images without a normal parent image.
- The Dockerfile section said the `FROM` instruction at the top tells you exactly which base image was used. Updated this to explain that `FROM` starts a build stage and that multi-stage Dockerfiles can have multiple `FROM` instructions.
- The `docker history` section treated `<missing>` image IDs as evidence that layers came from the base image. Updated this to match Docker's documentation: `<missing>` can also appear for steps built on another system or with BuildKit.
- The Docker Hub API section said the API returns Dockerfile or build details. Updated it to say the registry API returns manifests or manifest lists, and clarified the multi-platform manifest-list case.
- The Docker Hub API `Accept` headers only requested Docker schema v2 manifests. Added Docker manifest list and OCI index/manifest media types so the request is accurate for modern multi-platform images.
- The layer comparison script claimed to check whether candidate layers appeared at the start of the target image, but it only checked whether each layer appeared anywhere and used `grep` pattern matching. Replaced it with an ordered Bash array comparison that verifies the candidate layer list is a prefix of the target layer list.
- The Dive and layer stack sections stated that base layers always form the initial operating system layers. Softened this to "often" or "usually" to account for scratch images, non-OS images, and unusual build patterns.

## Review Notes
The revised Bash script was checked with `bash -n`. Docker Scout was verified against official Docker documentation; the local Docker installation did not include the Scout plugin, so the command was not run locally.

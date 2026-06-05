# Validation Summary: How to Check the OS and Architecture of a Docker Image

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine CLI
- Docker images and image inspection
- Docker manifest lists and OCI image indexes
- Docker Buildx imagetools
- Docker Registry HTTP API V2
- Skopeo
- jq
- ARM, ARM64, AMD64, and Windows container platforms

## Sources Consulted
- Docker CLI reference: `docker inspect` - https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI reference: `docker manifest inspect` - https://docs.docker.com/reference/cli/docker/manifest/inspect/
- Docker CLI reference: `docker buildx imagetools inspect` - https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/
- Docker CLI reference: `docker buildx build` - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker CLI reference: `docker image pull` - https://docs.docker.com/reference/cli/docker/image/pull/
- Docker CLI reference: `docker container run` - https://docs.docker.com/reference/cli/docker/container/run/
- Docker CLI formatting guide - https://docs.docker.com/engine/cli/formatting/
- CNCF Distribution Registry HTTP API V2 specification - https://distribution.github.io/distribution/spec/api/
- Open Container Initiative image index specification - https://github.com/opencontainers/image-spec/blob/main/image-index.md
- Skopeo upstream documentation - https://github.com/containers/skopeo
- Local Docker CLI help from Docker version 29.4.2

## Issues Found
- The post said ARM variant `v8` is "arm64." This was imprecise: `arm` and `arm64` are architecture values, while `variant` identifies CPU variants. Updated the text to state that variant values such as `v6`, `v7`, and `v8` are CPU variants and that the architecture field determines `arm` versus `arm64`.
- The post said enabling `DOCKER_CLI_EXPERIMENTAL` is needed for `docker manifest inspect`. Current Docker CLI documentation still marks the command experimental, but local Docker 29.4.2 exposes the command without requiring the environment variable. Updated the comment to say older Docker CLI versions may require it.
- The Registry API example requested only the Docker manifest list media type. Modern registries may return OCI image indexes for multi-platform images. Updated the `Accept` header to include both `application/vnd.docker.distribution.manifest.list.v2+json` and `application/vnd.oci.image.index.v1+json`.

## Review Notes
The Docker Hub live manifest checks for `nginx:latest` could not complete because the environment hit Docker Hub's unauthenticated pull rate limit. Command syntax and behavior were verified against official Docker documentation and local Docker CLI help instead.

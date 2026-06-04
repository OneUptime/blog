# Validation Summary: How to Use the FROM Instruction in Dockerfiles (Base Image Selection)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfiles
- Docker base images
- Docker multi-stage builds
- Docker Buildx
- Docker Scout
- Distroless images
- Alpine Linux
- Go container builds

## Sources Consulted
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker multi-platform builds documentation: https://docs.docker.com/build/building/multi-platform/
- Docker Scout CVEs CLI reference: https://docs.docker.com/reference/cli/docker/scout/cves/
- Docker Official Images documentation: https://docs.docker.com/docker-hub/repos/manage/trusted-content/official-images/
- Docker Hub scratch official image page: https://hub.docker.com/_/scratch
- GoogleContainerTools distroless README: https://github.com/GoogleContainerTools/distroless
- Docker Alpine Official Image article: https://www.docker.com/blog/how-to-use-the-alpine-docker-official-image/
- Local Docker CLI help for `docker buildx build` and `docker inspect`

## Issues Found
- The simplified "Full syntax" comment for `FROM` showed only an optional tag. Updated it to mention digests as well, because Dockerfile `FROM` supports image references with tags and/or digests.
- The tag explanation implied a tag identifies a specific immutable version. Updated it to say tags identify versions or variants, while digests pin the exact image.
- The distroless security explanation claimed there is nothing for an attacker to exploit. Updated it to the more accurate claim that distroless images reduce OS packages and tools in the image.
- The platform section implied Dockerfile `FROM --platform` directly builds images for a target architecture. Updated it to clarify that `FROM --platform` selects the platform of the base image, while Buildx `--platform` controls multi-platform build output.
- The `scratch` section said statically compiled binaries do not need an operating system. Updated it to say they do not need an operating system userland in the image.

## Review Notes
The Dockerfile snippets and CLI examples are syntactically valid. Several version tags in examples, such as `golang:1.22` and `alpine:3.19`, are older examples as of June 4, 2026; they remain valid Docker image references, but future posts may prefer newer supported runtime tags.

# Validation Summary: How to Use the LABEL Instruction for Image Metadata

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile `LABEL`, `ARG`, and `MAINTAINER` instructions
- Docker CLI inspection and label filtering
- Docker Compose service labels
- OCI image annotations
- Skopeo remote image inspection
- Traefik, Watchtower, and Prometheus label-based tooling

## Sources Consulted
- Docker Dockerfile reference, including `LABEL`, `ARG`, and deprecated `MAINTAINER`: https://docs.docker.com/reference/dockerfile/
- Docker object labels documentation: https://docs.docker.com/engine/manage-resources/labels/
- Docker build variables documentation: https://docs.docker.com/build/building/variables/
- Docker build best practices for `LABEL`: https://docs.docker.com/build/building/best-practices/
- Docker Compose services reference for `labels`: https://docs.docker.com/reference/compose-file/services/
- OCI Image Spec annotations: https://specs.opencontainers.org/image-spec/annotations/
- Docker CLI local help for `docker images`, `docker ps`, and `docker buildx imagetools inspect`
- Skopeo inspect man page: https://www.mankier.com/1/skopeo-inspect
- Traefik Docker provider documentation: https://doc.traefik.io/traefik/v2.10/providers/docker/
- Watchtower container selection documentation: https://watchtower.devcdn.net/container-selection/

## Issues Found
- The post claimed each separate `LABEL` instruction creates a new layer and recommended combining labels to reduce layers. Docker's current documentation says this was only relevant before Docker 1.10 and is no longer needed for final image size. Updated the wording to say combining labels is optional and can help keep related metadata together.
- The post said `MAINTAINER` creates an additional layer. Docker documents `MAINTAINER` as deprecated in favor of `LABEL`, but the layer claim is no longer a useful or accurate reason to avoid it. Removed that claim.
- The dynamic-label Dockerfile examples declared `ARG` values before `FROM` and used them after `FROM`. Docker's `ARG` scoping rules require those arguments to be declared inside the build stage to use them after `FROM`. Moved the `ARG` declarations after `FROM` in both examples.
- The Compose section described labels generically. Compose service `labels` add metadata to containers, not image metadata. Updated the wording to clarify these are container labels.
- The label inheritance example asserted that `python:3.11-slim` already has labels set by the Python maintainers. Current registry inspection shows OCI annotations for that image, but not necessarily Docker config labels. Replaced the specific assertion with a generic statement about inherited labels when the base image has them.
- The remote inspection section used `docker buildx imagetools inspect ... --format '{{json .Manifest}}'` as a way to view labels. That command reports registry manifest data and annotations, not Docker image config labels. Replaced the label example with `skopeo inspect --format '{{json .Labels}}' ...` and reframed the `buildx imagetools` command as viewing OCI manifest annotations.

## Review Notes
Validated the corrected `ARG`/`LABEL` pattern with a local `docker build` using `FROM scratch`, and validated both Docker Compose label syntaxes with `docker compose config --quiet`. `skopeo` was not installed locally, so its command syntax was checked against the published `skopeo-inspect` man page.

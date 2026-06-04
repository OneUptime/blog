# Validation Summary: How to Use Docker History to Understand Image Build Steps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker images and image history
- Dockerfile instructions
- Docker BuildKit
- Docker build cache
- Multi-stage Docker builds
- `.dockerignore`

## Sources Consulted
- Docker CLI reference: `docker image history` / `docker history` - https://docs.docker.com/reference/cli/docker/image/history/
- Docker CLI reference: `docker image ls` / `docker images` - https://docs.docker.com/reference/cli/docker/image/ls/
- Docker CLI reference: `docker image pull` / `docker pull` - https://docs.docker.com/reference/cli/docker/image/pull/
- Docker Build reference: `docker buildx build` / `docker build`, including `--target` - https://docs.docker.com/engine/reference/commandline/build
- Dockerfile reference, including `RUN`, `COPY`, `ADD`, `ARG`, `ENV`, `EXPOSE`, and `CMD` behavior - https://docs.docker.com/reference/dockerfile/
- Docker build cache invalidation documentation - https://docs.docker.com/build/cache/invalidation/
- Docker multi-stage builds documentation - https://docs.docker.com/build/building/multi-stage/
- Docker build context and `.dockerignore` documentation - https://docs.docker.com/build/building/context/
- Local Docker CLI help output for `docker history --help`, `docker image ls --help`, and `docker build --help`

## Issues Found
- The introduction said every Dockerfile instruction creates a new layer. This was too broad because filesystem layers are created by instructions such as `RUN`, `COPY`, and `ADD`, while metadata instructions such as `ENV`, `EXPOSE`, and `CMD` appear in history without adding filesystem data. Updated the wording to distinguish filesystem layers from history entries.
- The output explanation said every row is a layer and that the `IMAGE` column is the layer ID. Docker documents this field as the image ID, and history output can include metadata-only entries. Updated the wording to describe rows as history entries and the `IMAGE` field as an image or intermediate image ID when available.
- The `IMAGE` column description claimed base image layers show as `<missing>` because Docker does not store their IDs locally after pulling. This was too specific and not supported by the Docker CLI reference. Updated it to say `<missing>` means Docker does not have an image ID to display for that history entry.
- A paragraph introduced a filtering command as using "the quiet flag with inspect", but the command uses neither `--quiet` nor `docker inspect`. Updated it to describe filtering out zero-byte entries.

## Review Notes
The command examples and flags reviewed are current for the Docker CLI. The size examples for specific Python tags are presented as typical output and may vary over time as official images are rebuilt.

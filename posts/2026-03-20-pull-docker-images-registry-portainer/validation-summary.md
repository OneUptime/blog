# Validation Summary: How to Pull Docker Images from a Registry in Portainer - Docker

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine CLI
- Docker registries

## Sources Consulted
- Portainer Docs: Images overview - https://docs.portainer.io/user/docker/images
- Portainer Docs: Pull an image - https://docs.portainer.io/user/docker/images/pull
- Portainer Docs: Build a new image - https://docs.portainer.io/user/docker/images/build
- Portainer Docs: Add a custom registry - https://docs.portainer.io/admin/registries/add/custom
- Docker Docs: `docker image pull` - https://docs.docker.com/reference/cli/docker/image/pull/
- Docker Docs: `docker login` - https://docs.docker.com/reference/cli/docker/login/
- Docker Docs: `docker image build` - https://docs.docker.com/reference/cli/docker/image/build/
- Docker Docs: `docker image save` - https://docs.docker.com/reference/cli/docker/image/save/
- Docker Docs: `docker image load` - https://docs.docker.com/reference/cli/docker/image/load/
- Docker Docs: `docker image tag` - https://docs.docker.com/reference/cli/docker/image/tag/
- Docker Docs: `docker image push` - https://docs.docker.com/reference/cli/docker/image/push/
- Docker Docs: Prune unused Docker objects - https://docs.docker.com/engine/manage-resources/pruning/
- Docker Docs: `docker system df` - https://docs.docker.com/reference/cli/docker/system/df/
- Docker Docs: `docker image inspect` - https://docs.docker.com/reference/cli/docker/image/inspect/
- Docker Docs: Format command and log output - https://docs.docker.com/engine/cli/formatting/

## Issues Found
- The Portainer UI instructions used outdated wording for the current interface. I updated the pull flow to match the `Images` page and its Advanced mode, and updated the build flow to `Images > Build a new image`.
- The `docker pull nginx:latest 2>&1 | grep -E "Pull complete|up to date"` example was not a reliable way to determine whether a newer image was available. `Pull complete` is layer-level output, not a digest comparison result. I replaced it with a plain `docker pull nginx:latest` instruction and clarified that Docker's status line should be reviewed.
- The image date example used the generic `docker inspect` command. I changed it to `docker image inspect` to use Docker's image-specific command reference.

## Review Notes
- The `docker build` examples remain valid, but current Docker releases run `docker build` through Buildx/BuildKit by default except for legacy cases such as some Windows container workflows.
- Docker CLI was not installed in the local workspace, so command validation was performed against official Docker and Portainer documentation rather than local `--help` output.

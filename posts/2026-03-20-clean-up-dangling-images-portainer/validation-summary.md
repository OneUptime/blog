# Validation Summary: How to Clean Up Dangling Images in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker
- Docker images
- Container registries

## Sources Consulted
- Portainer Docs, Pull an image: https://docs.portainer.io/user/docker/images/pull
- Portainer Docs, Build a new image: https://docs.portainer.io/2.27/user/docker/images/build
- Portainer Docs, Import an image: https://docs.portainer.io/user/docker/images/import
- Portainer Docs, Export an image: https://docs.portainer.io/user/docker/images/export
- Portainer Docs, Docker roles and permissions: https://docs.portainer.io/advanced/docker-roles-and-permissions
- Docker Docs, `docker image pull`: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker Docs, `docker login`: https://docs.docker.com/reference/cli/docker/login/
- Docker Docs, `docker image build` / `docker build`: https://docs.docker.com/reference/cli/docker/image/build/
- Docker Docs, `docker image save`: https://docs.docker.com/reference/cli/docker/image/save/
- Docker Docs, `docker image load`: https://docs.docker.com/reference/cli/docker/image/load/
- Docker Docs, `docker image tag`: https://docs.docker.com/reference/cli/docker/image/tag/
- Docker Docs, `docker image prune`: https://docs.docker.com/reference/cli/docker/image/prune/
- Docker Docs, Prune unused Docker objects: https://docs.docker.com/engine/manage-resources/pruning/
- Docker Docs, `docker system df`: https://docs.docker.com/reference/cli/docker/system/df/
- Docker Docs, `docker inspect`: https://docs.docker.com/reference/cli/docker/inspect/
- GitHub profile link checked: https://github.com/nawazdhandala
- OneUptime site link checked: https://oneuptime.com/

## Issues Found
- The post described dangling images as "untagged, unreferenced layers". Docker defines dangling images as untagged images not referenced by any container. I corrected the description and the `docker image prune` comment to match Docker's documented behavior.
- The Portainer UI text for pulling and building images did not match current Portainer documentation. I updated the pull instructions to the documented `Images` flow and changed `Build image` to `Build a new image`.
- The command `docker pull nginx:latest 2>&1 | grep -E "Pull complete|up to date"` was not a reliable way to check whether an image tag was outdated. `Pull complete` indicates layer download progress, not whether the tag changed. I replaced it with `docker pull nginx:latest` so Docker reports freshness directly, and added a digest inspection command to show the pulled image digest.

## Review Notes
- The remaining Docker CLI examples are syntactically correct and align with current Docker CLI documentation.
- `docker build` remains a valid command. Current Docker documentation notes that it uses Buildx/BuildKit by default in modern Docker releases.
- The post is broader than its title and covers general image management in Portainer and Docker in addition to dangling-image cleanup, but the technical content is still relevant after the corrections above.

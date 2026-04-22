# Validation Summary: How to Search Docker Hub for Images in Portainer - Images

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Hub
- Docker images
- Docker CLI
- Docker registries

## Sources Consulted
- Portainer documentation: Images - https://docs.portainer.io/user/docker/images
- Portainer documentation: Pull an image - https://docs.portainer.io/user/docker/images/pull
- Portainer documentation: Build a new image - https://docs.portainer.io/user/docker/images/build
- Portainer documentation: Import an image - https://docs.portainer.io/user/docker/images/import
- Portainer documentation: Export an image - https://docs.portainer.io/user/docker/images/export
- Docker CLI reference: docker image pull - https://docs.docker.com/reference/cli/docker/image/pull/
- Docker CLI reference: docker login - https://docs.docker.com/reference/cli/docker/login/
- Docker CLI reference: docker buildx build - https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker CLI reference: docker image save - https://docs.docker.com/reference/cli/docker/image/save/
- Docker CLI reference: docker image load - https://docs.docker.com/reference/cli/docker/image/load/
- Docker CLI reference: docker image tag - https://docs.docker.com/reference/cli/docker/image/tag/
- Docker CLI reference: docker image push - https://docs.docker.com/reference/cli/docker/image/push/
- Docker CLI reference: docker image rm - https://docs.docker.com/reference/cli/docker/image/rm/
- Docker CLI reference: docker image prune - https://docs.docker.com/reference/cli/docker/image/prune/
- Docker CLI reference: docker inspect - https://docs.docker.com/reference/cli/docker/inspect/
- Docker CLI reference: docker system df - https://docs.docker.com/reference/cli/docker/system/df/

## Issues Found
- The title, tags, and description described searching Docker Hub from the Portainer Images page, but Portainer's Images documentation describes pulling images from Docker Hub or another registry by selecting a registry and entering an image name. Updated the post metadata and heading to describe pulling Docker Hub images.
- The Portainer pull workflow said to optionally select a registry. The official workflow has the user select the registry, then enter the image name, so the sentence was corrected.
- The Portainer build workflow used the label "Build image" and said to upload a file. The official UI action is "Build a new image", and the upload method is specifically for a Dockerfile, so the sentence was corrected.
- The `docker image prune` comment described dangling images as "untagged layers". Docker documents this command as removing dangling images, so the comment was simplified.
- The outdated-image check implied `docker pull` only checks for a newer digest. The command actually refreshes the tag and reports whether a newer image was downloaded or the image is already up to date, so the comment and grep pattern were corrected.

## Review Notes
The Docker CLI examples are valid current commands. The `docker build` examples use the current Docker CLI alias that invokes Buildx/BuildKit by default in modern Docker installations.

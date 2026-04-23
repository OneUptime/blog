# Validation Summary: How to Remove Unused Docker Images in Portainer - Docker

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine CLI
- Docker registries and image archives

## Sources Consulted
- Portainer Docs, Images: https://docs.portainer.io/user/docker/images
- Portainer Docs, Pull an image: https://docs.portainer.io/user/docker/images/pull
- Portainer Docs, Build a new image: https://docs.portainer.io/user/docker/images/build
- Portainer Docs, Import an image: https://docs.portainer.io/user/docker/images/import
- Portainer Docs, Export an image: https://docs.portainer.io/user/docker/images/export
- Portainer Docs, Docker roles and permissions: https://docs.portainer.io/advanced/docker-roles-and-permissions
- Docker Docs, `docker image pull`: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker Docs, `docker image save`: https://docs.docker.com/reference/cli/docker/image/save/
- Docker Docs, `docker image load`: https://docs.docker.com/reference/cli/docker/image/load/
- Docker Docs, `docker image tag`: https://docs.docker.com/reference/cli/docker/image/tag/
- Docker Docs, `docker image push`: https://docs.docker.com/reference/cli/docker/image/push/
- Docker Docs, `docker image rm`: https://docs.docker.com/reference/cli/docker/image/rm/
- Docker Docs, `docker image inspect`: https://docs.docker.com/reference/cli/docker/image/inspect/
- Docker Docs, `docker image prune`: https://docs.docker.com/reference/cli/docker/image/prune/
- Docker Docs, Prune unused Docker objects: https://docs.docker.com/engine/manage-resources/pruning/
- Docker Docs, `docker system df`: https://docs.docker.com/reference/cli/docker/system/df/

## Issues Found
- The Portainer UI wording was slightly outdated. I changed `Images > Pull image` to the current pull flow and changed `Images > Build image` to `Images > Build a new image`, matching current Portainer documentation.
- The cleanup section described dangling images as "untagged layers". I corrected this to "untagged images" because `docker image prune` removes dangling images, not layers.
- The "Identify Outdated Images" example used `grep -E "Pull complete|up to date"`, which was not a reliable way to determine whether a pulled tag resolved to newer content. I updated it to match Docker's actual pull status messages and changed `docker inspect` to `docker image inspect` for image-specific inspection.

## Review Notes
- Portainer's current image build workflow supports the web editor, Dockerfile upload, and URL-based builds. It also documents a limitation around `ADD` and `COPY` when referencing host files during Portainer-based builds.
- Portainer also has an optional image up-to-date indicator for containers and services. That could be mentioned in a future revision if the post is expanded beyond CLI-based checks.

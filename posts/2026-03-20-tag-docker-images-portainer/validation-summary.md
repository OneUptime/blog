# Validation Summary: How to Tag Docker Images in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / practical guide

## Technologies Covered
- Portainer Docker/Swarm/Podman image management
- Portainer registry management
- Docker CLI image pull, build, tag, push, save, load, remove, prune, inspect, and disk usage commands
- Docker registries and image tags

## Sources Consulted
- Portainer Images documentation: https://docs.portainer.io/user/docker/images
- Portainer Pull an image documentation: https://docs.portainer.io/user/docker/images/pull
- Portainer Build a new image documentation: https://docs.portainer.io/user/docker/images/build
- Portainer Import an image documentation: https://docs.portainer.io/user/docker/images/import
- Portainer Export an image documentation: https://docs.portainer.io/user/docker/images/export
- Portainer Manage a registry documentation: https://docs.portainer.io/admin/registries/manage
- Docker `docker image build` reference: https://docs.docker.com/reference/cli/docker/image/build/
- Docker `docker image tag` reference: https://docs.docker.com/reference/cli/docker/image/tag/
- Docker `docker image pull` reference: https://docs.docker.com/reference/cli/docker/image/pull/
- Docker `docker image push` reference: https://docs.docker.com/reference/cli/docker/image/push/
- Docker `docker image save` reference: https://docs.docker.com/reference/cli/docker/image/save/
- Docker `docker image load` reference: https://docs.docker.com/reference/cli/docker/image/load/
- Docker `docker image prune` reference: https://docs.docker.com/reference/cli/docker/image/prune/
- Docker `docker image rm` reference: https://docs.docker.com/reference/cli/docker/image/rm/
- Docker `docker image inspect` reference: https://docs.docker.com/reference/cli/docker/image/inspect/
- Docker `docker system df` reference: https://docs.docker.com/reference/cli/docker/system/df/
- Docker `docker login` reference: https://docs.docker.com/reference/cli/docker/login/
- OneUptime homepage: https://oneuptime.com/

## Issues Found
- The post implied Portainer's Images page directly handled image retagging. Current Portainer documentation places registry tag cloning/retagging under **Registries > Browse > repository**, and supports local or registry tagging during **Images > Import**. Updated the description, introduction, and Tag Images section to reflect the correct Portainer paths.
- The Portainer pull/build UI labels were slightly off. Updated the pull instruction to use **Images** followed by **Pull the image**, and the build instruction to use **Images > Build a new image** with either the web editor or Dockerfile upload.
- The cleanup section described dangling images as "untagged layers." Docker documents `docker image prune` as removing dangling images, meaning untagged images not referenced by containers. Updated the wording.
- The outdated image example piped `docker pull` through `grep`, which could hide useful status output such as "Downloaded newer image" and did not actually check a digest. Replaced it with a plain `docker pull nginx:latest` command and clarified that it refreshes the tag and reports whether Docker downloaded a newer image.
- Changed the image creation date example from the generic `docker inspect` form to `docker image inspect`, matching Docker's image-specific CLI reference.

## Review Notes
Docker was not installed in the local workspace, so CLI `--help` verification could not be completed locally. The commands were verified against current official Docker CLI documentation instead. The post is now technically accurate, but a future revision could include screenshots or step-by-step Portainer UI detail for registry browsing.

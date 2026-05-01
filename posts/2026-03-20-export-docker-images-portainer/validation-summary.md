# Validation Summary: How to Export Docker Images from Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker CLI
- Container registries
- Docker image archives (`.tar`, `.tar.gz`)

## Sources Consulted
- Portainer Documentation, "Pull an image" - https://docs.portainer.io/user/docker/images/pull
- Portainer Documentation, "Build a new image" - https://docs.portainer.io/user/docker/images/build
- Portainer Documentation, "Import an image" - https://docs.portainer.io/user/docker/images/import
- Portainer Documentation, "Export an image" - https://docs.portainer.io/user/docker/images/export
- Docker Docs, "docker image pull" - https://docs.docker.com/reference/cli/docker/image/pull/
- Docker Docs, "docker image save" - https://docs.docker.com/reference/cli/docker/image/save/
- Docker Docs, "docker image load" - https://docs.docker.com/reference/cli/docker/image/load/
- Docker Docs, "docker image tag" - https://docs.docker.com/reference/cli/docker/image/tag/
- Docker Docs, "docker image rm" - https://docs.docker.com/reference/cli/docker/image/rm/
- Docker Docs, "docker image prune" - https://docs.docker.com/reference/cli/docker/image/prune/
- Docker Docs, "docker system df" - https://docs.docker.com/reference/cli/docker/system/df/
- Docker Docs, "docker inspect" - https://docs.docker.com/reference/cli/docker/inspect/

## Issues Found
- The Portainer pull instructions used imprecise UI wording. I updated them to match the documented current flow: select **Images**, choose a registry, enter the image name, and use **Advanced mode** for a custom registry URL and port.
- The Portainer build instructions referred to **Build image**. I changed this to **Build a new image** to match the current Portainer documentation and clarified that the web editor can be used to paste Dockerfile content or upload a Dockerfile file.
- The post title is specifically about exporting images from Portainer, but the import/export section only showed Docker CLI commands. I added the documented Portainer UI export/import steps and the supported archive formats for import.
- The cleanup example described `docker image prune` as removing "untagged layers". Docker documents this command as removing dangling images, so I corrected the wording.
- The outdated-image example claimed that grepping `docker pull` output checks whether a newer digest exists. That is not a reliable digest comparison. I replaced it with the documented behavior: pull the tag again to see whether Docker downloads a newer image.

## Review Notes
- `docker build` remains a valid command, but Docker now uses Buildx and BuildKit by default for most builds outside legacy Windows-container cases.
- This post covers image export and import only. Exported image archives do not include container volume data, so image backups are not full application backups.

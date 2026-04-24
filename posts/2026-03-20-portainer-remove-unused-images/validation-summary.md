# Validation Summary: How to Remove Unused Docker Images in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine / Docker CLI
- Shell scripting
- cron

## Sources Consulted
- Docker Docs: Prune unused Docker objects - https://docs.docker.com/engine/manage-resources/pruning/
- Docker Docs: `docker image prune` - https://docs.docker.com/reference/cli/docker/image/prune/
- Docker Docs: `docker image ls` - https://docs.docker.com/reference/cli/docker/image/ls/
- Docker Docs: `docker system prune` - https://docs.docker.com/reference/cli/docker/system/prune/
- Docker Docs: `docker system df` - https://docs.docker.com/reference/cli/docker/system/df/
- Docker Docs: `docker container ls` - https://docs.docker.com/reference/cli/docker/container/ls
- Docker Docs: `docker container create` - https://docs.docker.com/reference/cli/docker/container/create/
- Docker Docs: Images view and image usage definitions - https://docs.docker.com/desktop/use-desktop/images/
- Portainer Docs: Images - https://docs.portainer.io/user/docker/images

## Issues Found
- The post treated dangling images and unused images as the same thing. I corrected the explanation to match Docker's documented distinction: dangling images are untagged and unreferenced, while unused images may still be tagged but are not referenced by any running or stopped container.
- The example `docker images -q "myorg/*"` was not valid for pattern matching because `docker images` only accepts an exact `[REPOSITORY[:TAG]]` argument there. I replaced it with a documented `--filter=reference='myorg/*:*'` example.
- The cleanup script relied on undocumented `docker system df --format` template placeholders. I replaced that with parsing the documented default `docker system df` output for the `Images` row.
- The `docker system prune --volumes` explanation implied that all unused volumes are removed. I corrected the wording to align with the Docker CLI reference, which documents `--volumes` as pruning anonymous volumes.
- The image-protection example used `docker run ... sleep infinity`, which is not reliable for arbitrary images because entrypoint behavior varies. I replaced it with `docker create`, which is documented and still keeps the image associated with a container so `docker image prune -a` will not remove it.
- The Portainer prune instructions used an exact UI label that is not documented in Portainer's official docs. I changed that step to generic confirmation wording so it remains accurate across Portainer versions.

## Review Notes
- Portainer's official documentation currently documents the Images area at a high level but does not enumerate every remove/prune button label in the UI. The remaining Portainer navigation steps in the post are broadly consistent with the documented Images workflow.
- The destructive `docker rmi -f` example is technically valid according to Docker's CLI reference, but it remains high-risk because removing images referenced by running containers can break restarts.

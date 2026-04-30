# Validation Summary: How to Inspect Container Filesystem Changes in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine CLI
- Docker Engine API
- Docker Compose / Compose Specification

## Sources Consulted
- Portainer: View a container's details - https://docs.portainer.io/user/docker/containers/view
- Portainer: Inspect a container - https://docs.portainer.io/user/docker/containers/inspect
- Portainer: Access a container's console - https://docs.portainer.io/user/docker/containers/console
- Portainer: View container logs - https://docs.portainer.io/user/docker/containers/logs
- Portainer: View container statistics - https://docs.portainer.io/user/docker/containers/stats
- Portainer: Browse a volume - https://docs.portainer.io/user/docker/volumes/browse
- Portainer: Accessing the Portainer API - https://docs.portainer.io/2.21/api/access
- Portainer: API usage examples - https://docs.portainer.io/sts/api/examples
- Docker: `docker container diff` - https://docs.docker.com/reference/cli/docker/container/diff/
- Docker: `docker inspect` - https://docs.docker.com/reference/cli/docker/inspect/
- Docker: Storage - https://docs.docker.com/engine/storage/
- Docker: tmpfs mounts - https://docs.docker.com/engine/storage/tmpfs/
- Docker: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker: Engine API v1.24 - https://docs.docker.com/reference/api/engine/version/v1.24/

## Issues Found
- The original post treated Portainer as though it had a native UI for container writable-layer diffs. Based on Portainer's documented container actions, I corrected the article to explain that Portainer helps you locate the container, inspect mounts/configuration, and open a console, while Docker provides the actual filesystem change list.
- The main CLI example used `docker inspect`, which returns container metadata rather than filesystem changes. I replaced it with `docker container diff` / `docker diff`, which is Docker's documented command for this task.
- The Compose example was generic and included the obsolete top-level `version` field. I replaced it with a filesystem-relevant example using `volumes`, `tmpfs`, `read_only`, and `user`, and removed the obsolete `version` key.
- The command examples focused on stats, logs, and config inspection instead of filesystem analysis. I updated them to use `docker diff`, `docker inspect --size`, and `docker cp`, which are directly relevant to inspecting and extracting changed filesystem content.
- The troubleshooting section included an unverified Portainer "Re-sync" navigation path and a resource-limits example unrelated to the topic. I replaced these with guidance about checking the correct environment and understanding that writes to volumes, bind mounts, and tmpfs do not appear in `docker diff`.
- The Portainer API example listed containers instead of inspecting filesystem changes. I updated it to query Docker's `/containers/{id}/changes` endpoint through Portainer's Docker API proxy using the current access-token authentication pattern documented by Portainer.

## Review Notes
- Portainer's container documentation lists inspect, logs, stats, console, and related actions; the conclusion that there is no documented native writable-layer diff view is an inference from those official docs.
- `docker diff` only reports changes in the container's writable layer. Files written to named volumes, bind mounts, or tmpfs are outside that layer and must be inspected through mounts, the container console, or host-side tooling.
- Docker CLI was not available in the local review environment, so command behavior was validated against official Docker and Portainer documentation rather than live execution.

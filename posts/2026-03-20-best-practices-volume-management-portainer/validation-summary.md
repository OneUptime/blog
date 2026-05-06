# Validation Summary: Best Practices for Volume Management in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Docker volumes
- NFS-backed Docker volumes
- POSIX shell commands

## Sources Consulted
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: Define and manage volumes in Docker Compose - https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs: Define services in Docker Compose - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: `docker volume ls` - https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker Docs: `docker volume prune` - https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker Docs: `docker volume create` - https://docs.docker.com/reference/cli/docker/volume/create/
- Docker Docs: Docker object labels - https://docs.docker.com/engine/manage-resources/labels/
- Portainer Docs: Volumes - https://docs.portainer.io/user/docker/volumes
- Portainer Docs: Add a new volume - https://docs.portainer.io/user/docker/volumes/add
- Portainer Docs: Browse a volume - https://docs.portainer.io/user/docker/volumes/browse
- Portainer Docs: Edge Jobs - https://docs.portainer.io/2.33-lts/user/edge/jobs
- Portainer Docs: How Relative Path Support works in Portainer - https://docs.portainer.io/advanced/relative-paths
- Local Docker CLI help output: `docker volume ls --help`, `docker volume prune --help`, `docker system df --help`, `docker volume create --help`
- Local Compose validation with `docker compose config` on representative snippets using Docker Compose `v5.1.3`

## Issues Found
- The anonymous-volume example said Docker assigns a random UUID name. Docker documents anonymous volumes as getting a random unique name, so the wording was corrected.
- The "Read-Only Volumes for Configuration" section used a bind-mounted file example (`./nginx.conf:...:ro`), not a Docker volume. The section heading was corrected to "Read-Only Mounts for Configuration".
- The same configuration example used a relative bind mount path. Portainer documents relative path volumes as a Portainer Business Edition feature that must be enabled for Git-based stack deployments, so the example was changed to an absolute host path to keep it generally valid in Portainer environments.
- The cleanup script claimed `docker volume prune -f` removes all volumes not attached to containers. Docker documents that, by default, `docker volume prune` only removes unused anonymous volumes. The command was corrected to `docker volume prune --all -f` so it matches the explanation.
- The cleanup script comment said to schedule the script as a Portainer job. Current Portainer documentation documents this capability as Edge Jobs with specific prerequisites, not as a generic Docker job feature, so the wording was corrected.
- The summary claimed Portainer's volume browser gives visibility into all volumes and their connected containers. Portainer documents volume browsing as available only with Docker Swarm or the Portainer Agent, so the summary was corrected to reflect the actual scope of the feature.

## Review Notes
- The NFS `driver_opts` example is valid for Docker's `local` driver on Linux and Docker Desktop, but Docker documents these mount-style options as platform-specific.
- Relative bind mounts in Portainer are environment- and edition-dependent; Portainer documents them as a Business Edition capability for Git-based stack deployments when relative path volumes are enabled.
- `docker volume prune --all -f` removes all unused local volumes, including named volumes, so it should be used carefully in production environments.

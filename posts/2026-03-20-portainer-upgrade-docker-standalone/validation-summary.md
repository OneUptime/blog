# Validation Summary: How to Upgrade Portainer CE on Docker Standalone

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition (CE)
- Docker Engine / Docker CLI
- Docker named volumes
- Bash shell scripting

## Sources Consulted
- Portainer Docs: Updating on Docker Standalone - https://docs.portainer.io/start/upgrade/docker
- Portainer Docs: CLI configuration options - https://docs.portainer.io/advanced/cli
- Portainer Docs: Lifecycle policy - https://docs.portainer.io/start/lifecycle
- Portainer Docs: Requirements and prerequisites - https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer Docs: What does Portainer's backup include? - https://docs.portainer.io/faqs/getting-started/what-does-portainers-backup-include
- Portainer Docs: How can I roll back to a previous version of Portainer? - https://docs.portainer.io/faqs/troubleshooting/how-can-i-roll-back-to-a-previous-version-of-portainer
- Docker Docs: Back up, restore, or migrate data volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: docker inspect - https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: docker image inspect - https://docs.docker.com/reference/cli/docker/image/inspect/
- Docker Docs: docker image prune - https://docs.docker.com/reference/cli/docker/image/prune/
- Docker Docs: docker image rm - https://docs.docker.com/reference/cli/docker/image/rm/
- Docker Docs: docker exec - https://docs.docker.com/engine/reference/commandline/exec

## Issues Found
- The post used `portainer/portainer-ce:latest`, but Portainer's current official Docker Standalone upgrade guidance uses the `lts` tag for the recommended production upgrade path. I changed the pull and run commands to `portainer/portainer-ce:lts`.
- The specific version example used `2.20.2`, which is outdated relative to the current Portainer LTS stream as of 2026-04-24. I updated the pinned example to `2.39.1`.
- The alternate version-check command used `docker image inspect portainer`, which targets images, not the running `portainer` container. I replaced it with `docker inspect --format '{{.Config.Image}}' portainer`, which correctly reports the image used by the container.
- The backup example printed a filename that did not match the archive actually created. I introduced a `BACKUP_FILE` variable so the archive path and confirmation output stay consistent.
- The cleanup section said `docker image prune -f` removes old Portainer images, but Docker documents that this command removes dangling images by default. I corrected the wording and kept a separate explicit `docker image rm` example for removing an old Portainer tag.
- The upgrade script collected `PORTS` and `MOUNTS` from `docker inspect` but never used them, which was misleading. I removed those unused lines.
- The downtime section described maintenance-window practices as "zero-downtime", which is inaccurate for a stop/remove/run replacement on a single Docker standalone host. I changed the wording to "lower-disruption".

## Review Notes
- Portainer's lifecycle policy currently recommends the LTS stream for production workloads; this is why the commands were aligned to `portainer/portainer-ce:lts`.
- Portainer's official Docker Standalone update guide notes that port `8000` is only required for Edge Agent communication. The post's commands remain valid, but that port can be omitted if Edge features are not used.
- Portainer documents that downgrades are not straightforward because database schema changes can occur across upgrades; keeping a pre-upgrade backup remains important even when reusing the `portainer_data` volume.

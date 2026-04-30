# Validation Summary: How to Inspect Container Filesystem Changes in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine CLI
- Docker Compose
- Python

## Sources Consulted
- Docker CLI reference: `docker container diff` - https://docs.docker.com/reference/cli/docker/container/diff/
- Docker CLI reference: `docker container commit` - https://docs.docker.com/reference/cli/docker/container/commit/
- Docker CLI reference: `docker container run` (`--read-only`) - https://docs.docker.com/reference/cli/docker/container/run/
- Docker storage docs: tmpfs mounts - https://docs.docker.com/engine/storage/tmpfs/
- Docker storage docs: volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Compose file reference: services (`read_only`, `tmpfs`) - https://docs.docker.com/reference/compose-file/services/
- Docker Engine networking overview (`/etc/hosts` behavior and custom hosts) - https://docs.docker.com/engine/network/
- Portainer docs: access a container's console - https://docs.portainer.io/2.27/user/docker/containers/console
- Portainer docs: view a container's details - https://docs.portainer.io/user/docker/containers/view

## Issues Found
- The post said `docker diff` shows changes since the container started. Docker documents `docker diff` as showing changes since the container was created, so those references were corrected.
- The Portainer section implied `docker diff` could be run from Portainer's container console and suggested a `docker exec portainer-host docker diff ...` workflow. Portainer documents the console as a shell inside the selected container, not a host Docker CLI, so this section was corrected to use Portainer for locating the container and the Docker host for running `docker diff`.
- The line claiming Portainer's Container Details view shows diff information "in some versions" was not supported by Portainer's documentation. It was replaced with accurate references to Portainer's details, inspect, and console views.
- The suspicious example using `C /etc/hosts` was misleading because Docker documents that containers have Docker-managed `/etc/hosts` entries and supports additional host mappings there. It was replaced with a stronger security signal: `C /etc/shadow`.
- The commit section said the new image layer contained all diff changes and that committed images have all runtime changes baked in. Docker documents that `docker commit` captures container changes but excludes mounted volumes, so the wording was corrected to refer to writable-layer changes only.
- The read-only filesystem section said `docker diff` would only show changes in `tmpfs` and volume mounts. Docker documents `--read-only` as blocking writes to the root filesystem while `tmpfs` and volumes provide separate writable locations, so the statement was corrected to describe explicit writable paths and reduced writable-layer churn instead.

## Review Notes
- Docker was not installed in the local review environment, so CLI `--help` output could not be checked locally. Command behavior was verified against official Docker documentation instead.
- `docker diff` output commonly includes expected runtime changes under paths such as `/dev`, `/run`, and application log directories, so interpretation should remain context-specific.
- The Compose example is valid, but `tmpfs` behavior is platform-dependent and ultimately depends on the underlying Docker environment.

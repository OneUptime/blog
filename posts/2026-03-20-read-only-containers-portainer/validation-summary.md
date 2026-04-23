# Validation Summary: How to Set Up Read-Only Containers in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Compose Specification
- Portainer API

## Sources Consulted
- Portainer Docs: Add a new stack - https://docs.portainer.io/sts/user/docker/stacks/add
- Portainer Docs: Inspect or edit a stack - https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer Docs: Edit or duplicate a container - https://docs.portainer.io/2.21/user/docker/containers/edit
- Portainer Docs: View a container's details - https://docs.portainer.io/user/docker/containers/view
- Portainer Docs: API documentation - https://docs.portainer.io/api/docs
- Portainer Docs: API usage examples - https://docs.portainer.io/sts/api/examples
- Docker Docs: Define services in Docker Compose (`read_only`) - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: `docker container run` / `docker container create` (`--read-only`) - https://docs.docker.com/reference/cli/docker/container/run and https://docs.docker.com/reference/cli/docker/container/create/
- Docker Docs: `docker inspect` - https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: tmpfs mounts - https://docs.docker.com/engine/storage/tmpfs/

## Issues Found
- The original post did not actually explain how to enable a read-only root filesystem. I replaced the generic inspection and resource-management examples with documented `read_only: true` and `--read-only` examples, plus verification steps using `HostConfig.ReadonlyRootfs`.
- The prerequisites and workflow mixed Docker and Kubernetes concepts, but the commands and Portainer paths used in the post were Docker-specific. I corrected the scope to a Docker environment connected to Portainer.
- The Compose example used an obsolete top-level `version` field and unrelated `deploy.resources` settings while omitting the actual `read_only` setting. I replaced it with a focused Compose example that sets `read_only: true` and explicitly provides writable paths through `volumes` and `tmpfs`.
- The Docker and Portainer API verification examples inspected the wrong fields for this topic. I updated them to inspect `HostConfig.ReadonlyRootfs` and mounted paths, which is the relevant runtime state for a read-only root filesystem.
- The troubleshooting section covered unrelated issues such as generic permissions and resource limits. I replaced it with read-only-filesystem-specific troubleshooting that matches Docker's documented behavior.

## Review Notes
- `tmpfs` mounts are documented by Docker for Linux hosts. If a workload needs a temporary writable directory, this is appropriate on Linux; otherwise use an explicit writable volume for the required path.
- For Portainer stacks deployed from a Git repository, Portainer's docs note that the Compose file must be edited in the repository rather than directly in the Portainer stack editor.

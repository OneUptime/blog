# Validation Summary: How to Deploy Stacks with Named Volumes and NFS Mounts in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker stack / Compose v3 stack files
- Docker named volumes
- NFS

## Sources Consulted
- Docker Docs: Deploy a stack to a swarm - https://docs.docker.com/engine/swarm/stack-deploy/
- Docker Docs: `docker stack deploy` - https://docs.docker.com/reference/cli/docker/stack/deploy/
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: Define and manage volumes in Docker Compose - https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs: Compose Deploy Specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Start containers automatically - https://docs.docker.com/engine/containers/start-containers-automatically/
- Portainer Documentation: Add a new stack - https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Linux `nfs(5)` manual page - https://man7.org/linux/man-pages/man5/nfs.5.html

## Issues Found
- The stack example used `restart: unless-stopped`, which is a container restart policy, not the Swarm service restart mechanism used by Portainer stack deploys on Swarm. I replaced it with `deploy.restart_policy.condition: any`.
- The example service `my-media-processor:latest` was a placeholder image that would not be deployable as written. I replaced it with a real public image and a simple long-running command so the example stack is runnable.
- The Step 3 heading referred to "authentication options", but the example only showed mount tuning options. I renamed the section to match the actual configuration shown.
- The Step 3 example used `type: nfs4` plus the obsolete `intr` option. I changed the example to Docker's documented `type: nfs` pattern and removed `intr`, which Linux documents as ignored on modern kernels.
- The mount-options table claimed `noatime` improves NFS performance. Linux documents that `atime` and `diratime` related mount options have no effect on NFS mounts, so I replaced that row with a valid option used in the example.
- The deployment text said Portainer creates the NFS-backed volume on first deploy. For the local volume driver, Docker creates locally scoped volumes on the nodes where tasks start. I corrected that wording.
- The verification step said to use "Portainer's terminal" for `docker volume inspect`. That command is a Docker host CLI command, and the relevant volume is local to a node running a task that uses it. I updated the instruction accordingly.
- The prerequisite line implied `apt install nfs-common` as a generic host requirement. I clarified that it is an example for Debian/Ubuntu hosts.

## Review Notes
- `docker stack deploy` still uses the legacy Compose v3 stack format rather than the latest Compose Specification, so keeping the example in stack-file style is appropriate for this post.
- The base example still uses the valid `soft` NFS mount option, but Linux NFS documentation notes data-integrity tradeoffs with `soft`; `hard` is generally safer for critical write-heavy workloads.
- Docker CLI was not available in the workspace, so the review was completed against current official documentation rather than by executing live Docker commands locally.

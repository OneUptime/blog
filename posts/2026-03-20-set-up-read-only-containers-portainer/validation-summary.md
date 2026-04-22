# Validation Summary: How to Set Up Read-Only Containers in Portainer - Set

## Status
validated

## Post Type
Tutorial / security hardening guide

## Technologies Covered
- Portainer Stacks
- Docker Compose
- Docker Engine containers
- Docker tmpfs mounts and named volumes
- Docker Linux capabilities and security options
- Kubernetes securityContext
- Kubernetes emptyDir volumes
- strace

## Sources Consulted
- Portainer Documentation: Add a new stack - https://docs.portainer.io/sts/user/docker/stacks/add
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose volumes reference - https://docs.docker.com/reference/compose-file/volumes/
- Docker Docs: tmpfs mounts - https://docs.docker.com/engine/storage/tmpfs/
- Docker Docs: docker container run reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: docker container exec reference - https://docs.docker.com/reference/cli/docker/container/exec/
- Docker Hub: nginx Official Image - https://hub.docker.com/_/nginx
- Kubernetes Documentation: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Documentation: Volumes, emptyDir - https://kubernetes.io/docs/concepts/storage/volumes/#emptydir
- Local CLI reference: `strace --help`

## Issues Found
- The introduction and blast-radius bullets described the whole container filesystem too broadly. Updated the wording to specify the image-backed root filesystem, because writable tmpfs mounts and volumes remain writable.
- The main Compose example used the obsolete top-level `version: "3.8"` field. Removed it to match current Compose Specification guidance.
- The Compose examples referenced named volumes without declaring them in a top-level `volumes` section. Added `app-logs`, `app-uploads`, and `nginx-logs` declarations.
- The Java row listed `/proc` and `/sys` under writable paths even though those are runtime pseudo-filesystems and were marked read-only in the text. Replaced that row with typical writable Java paths such as `/tmp` and application log or heap dump directories.
- The Nginx example used the outdated `nginx:1.25-alpine` sample tag. Changed it to `nginx:stable-alpine`.
- The `docker exec webapp ...` commands used a Compose service name where Docker expects a container name or ID. Added a `CONTAINER` variable and used it in the commands.
- The Kubernetes example used `emptyDir: {}` for `/tmp`, which is writable but not memory-backed by default. Changed it to `emptyDir.medium: Memory` to match the tmpfs equivalent described in the post.
- The strace troubleshooting command assumed `strace` was present in the image and only matched a narrow subset of write opens. Clarified the prerequisite and expanded the trace/grep pattern to include `O_RDWR` and common file-changing syscalls.

## Review Notes
- Docker is not installed in the review environment, so Docker and Compose snippets were validated against official documentation rather than by running containers locally.
- Portainer can deploy stacks to different Docker environment types; options should still be tested in the target Portainer environment, especially when using Swarm-backed stacks.

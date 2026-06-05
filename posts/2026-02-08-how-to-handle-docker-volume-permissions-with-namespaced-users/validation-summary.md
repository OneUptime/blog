# Validation Summary: How to Handle Docker Volume Permissions with Namespaced Users

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine
- Docker volumes and bind mounts
- Docker Compose
- Linux user namespaces
- Linux subordinate UID/GID mappings
- POSIX ACLs

## Sources Consulted
- Docker Docs: Isolate containers with a user namespace - https://docs.docker.com/engine/security/userns-remap/
- Docker Docs: Bind mounts - https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker Docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Control startup and shutdown order in Compose - https://docs.docker.com/compose/how-tos/startup-order/
- Docker CLI help output for `docker run` and `docker volume create`
- Docker Compose CLI validation using `docker compose config -q`
- Linux man pages: `user_namespaces(7)`, `subuid(5)`, and `setfacl(1)`

## Issues Found
- The daemon configuration command used `cat > /etc/docker/daemon.json`, which fails for a non-root shell because the redirection is not elevated. Changed it to `sudo tee /etc/docker/daemon.json > /dev/null`.
- The initial verification command used `docker run --rm alpine id`, which only shows the container's internal UID. Changed it to read `/proc/self/uid_map` so it shows the user namespace mapping.
- The bind-mount failure example used default file and directory permissions that are commonly world-readable, so the read could succeed. Added restrictive `chmod` commands and clarified that the example is about a private host file.
- The explanation said the container sees host UID 1000 as a high UID outside its namespace. Linux exposes unmapped IDs as the overflow UID, usually 65534, so the text was corrected.
- The container-created-file example reused the now-private `/tmp/testdata` directory, which would prevent the container from writing. Changed it to use a separate writable demo directory.
- The Compose examples used the obsolete top-level `version: "3.8"` property. Removed it to match the current Compose Specification.
- The multi-user Compose example described an init container running before the writer and reader services but did not declare dependencies. Added `depends_on` with `service_completed_successfully` for both services.
- The debugging section used `docker inspect --format '{{.HostConfig.UsernsMode}}'`, which does not show the actual kernel UID/GID mappings for a daemon-default remap. Replaced it with commands that read `/proc/${PID}/uid_map` and `/proc/${PID}/gid_map`.

## Review Notes
The corrected examples are Linux-focused and assume Docker Engine user namespace remapping, not Docker Desktop's file-sharing behavior or rootless Docker. The named-volume guidance remains accurate as a practical preference, but bind mounts can still be appropriate when host-path access is required and ownership is deliberately arranged.

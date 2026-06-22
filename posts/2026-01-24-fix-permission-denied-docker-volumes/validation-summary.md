# Validation Summary: How to Fix 'Permission Denied' Errors in Docker Volumes

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Docker Engine
- Docker bind mounts and named volumes
- Docker Compose
- Dockerfile instructions
- Linux UID/GID permissions
- Docker user namespace remapping
- Docker Desktop for macOS and Windows
- SELinux bind mount labels
- Alpine Linux `su-exec`
- Debian/Ubuntu `gosu`

## Sources Consulted
- Docker Docs: Bind mounts, including bind mount syntax, Docker Desktop behavior, and SELinux `z`/`Z` labels: https://docs.docker.com/engine/storage/bind-mounts/
- Docker Docs: Compose services reference, including `depends_on`, `user`, and `volumes` syntax: https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose profiles behavior and profile-disabled dependency constraints: https://docs.docker.com/reference/compose-file/profiles/
- Docker Docs: User namespace remapping and `userns-remap` daemon configuration: https://docs.docker.com/engine/security/userns-remap/
- Docker Docs: Dockerfile reference for `ARG`, `COPY --chown`, `USER`, `ENTRYPOINT`, and `CMD`: https://docs.docker.com/reference/dockerfile/
- Docker Docs: Running containers and `docker run` command form: https://docs.docker.com/engine/containers/run/
- Node.js Docker image best practices, documenting the `node` user with UID 1000: https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md
- Docker Hub official NGINX image documentation, documenting the Alpine `nginx` user UID/GID: https://hub.docker.com/_/nginx
- Docker Docs: Docker Desktop synchronized file shares for current macOS/Windows bind mount behavior: https://docs.docker.com/desktop/features/synchronized-file-sharing/

## Issues Found
- The opening permission-denied example showed the host file as `-rw-r--r--`, which is world-readable, so `cat` from a different container UID would not normally fail on Unix permissions. Changed the example mode to `-rw-------` so the demonstrated read failure matches the stated UID mismatch.
- The Compose example used `${UID}` and `${GID}` and then instructed users to `export UID=$(id -u)`. In Bash, `UID` is a readonly shell variable, so that export command fails. Changed the variables to `HOST_UID` and `HOST_GID`.
- The named-volume initialization example made `app` depend on `volume-init` while `volume-init` was gated behind the `init` profile. Docker Compose profile documentation states that inactive-profile services referenced by dependencies can make the model invalid. Removed the `depends_on` block and kept the documented one-time init workflow.
- The `daemon.json` example included a `// /etc/docker/daemon.json` comment inside a JSON code block. Docker daemon configuration is JSON, so comments are invalid. Moved the file path into prose and left the code block as valid JSON.

## Review Notes
- The macOS `:cached` and `:delegated` consistency options are older Docker Desktop performance hints. Current Docker Desktop documentation emphasizes Synchronized file shares and virtual filesystem backends for bind mount performance. The snippet remains plausible for existing Compose files, but the post could be updated in the future to focus more on current Docker Desktop file sharing settings.

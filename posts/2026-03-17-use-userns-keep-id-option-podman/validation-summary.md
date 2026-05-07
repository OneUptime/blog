# Validation Summary: How to Use the --userns=keep-id Option in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Rootless containers
- Linux user namespaces
- Bind mounts
- PostgreSQL container image
- Nginx container image
- SELinux volume labeling

## Sources Consulted
- Podman run reference documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- Docker Official Image packaging for postgres:15: https://github.com/docker-library/postgres/blob/master/15/bookworm/Dockerfile
- Docker Official Image documentation for postgres: https://github.com/docker-library/docs/blob/master/postgres/README.md

## Issues Found
- The bind-mount example described files created by container root as a "problem," but in rootless Podman container root maps to the invoking host user by default. Updated the comment to describe this as default rootless behavior.
- The bind-mount examples omitted the common SELinux labeling requirement. Added a short note to use `:Z` or `:z` when SELinux labels block access.
- The PostgreSQL service example used plain `--userns=keep-id`, which maps the host user to the same numeric UID inside the container. For the official `postgres:15` image, the `postgres` account is UID/GID 999, so the data directory example should map the host user to that account when running as `postgres`. Updated the command to use `--user postgres` and `--userns=keep-id:uid=999,gid=999`.

## Review Notes
The Podman `--userns=keep-id` syntax, `uid=` and `gid=` options, rootless default root mapping explanation, bind mount behavior, and namespace inspection commands are consistent with current Podman documentation. The examples were not executed locally because Podman is not installed in this environment.

# Validation Summary: How to Use the unshare Command with Podman

## Status
validated

## Post Type
Guide / hands-on tutorial

## Technologies Covered
- Podman
- Rootless containers
- Linux user namespaces
- Bind mounts and volume ownership
- SELinux volume labeling

## Sources Consulted
- Podman `podman-unshare` man page: https://docs.podman.io/en/v5.5.2/markdown/podman-unshare.1.html
- Podman `podman-run` man page: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman rootless UID/GID mapping reference: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- Linux `user_namespaces(7)` manual: https://man7.org/linux/man-pages/man7/user_namespaces.7.html
- Linux `subuid(5)` manual: https://www.man7.org/linux/man-pages/man5/subuid.5.html
- Docker Official Image source for `postgres:16`: https://github.com/docker-library/postgres/blob/master/16/bookworm/Dockerfile
- Docker Official Image `postgres` documentation: https://github.com/docker-library/docs/blob/master/postgres/README.md

## Issues Found
- Corrected the rootless UID/GID mapping math. The original post had off-by-one host ID ranges and examples; with a mapping of `0 -> $UID` and `1 -> $FIRST_SUBUID`, container UID 1000 maps to host UID 100999, and container UID 33 maps to host UID 100032.
- Updated the bind-mount examples to use `:Z` where appropriate. Podman's official volume documentation notes that SELinux-labeled systems can deny access to unlabeled bind mounts even when ownership is otherwise correct.
- Replaced the `seccomp` example in the safety section. Checking `/proc/self/status` for seccomp does not validate the user namespace behavior of `podman unshare`, so the example was changed to inspect the user namespace directly.
- Replaced `podman unshare bash` in the summary with `podman unshare`, which matches Podman's documented default behavior of launching `$SHELL` and avoids assuming `bash` is installed.

## Review Notes
- The examples assume Podman's default rootless UID/GID mapping. Containers started with custom `--userns`, `--uidmap`, or `--gidmap` settings can see different mappings.
- `podman unshare` is not available with the remote Podman client, per the current Podman man page.

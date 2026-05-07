# Validation Summary: How to Troubleshoot Rootless Podman Permission Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Podman
- Rootless containers
- Linux user namespaces
- subuid/subgid mappings
- Bind mounts and named volumes
- fuse-overlayfs and containers storage configuration
- SELinux volume labels
- Linux sysctl privileged-port configuration

## Sources Consulted
- Podman run manual: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman manual rootless mode and storage notes: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman upstream rootless shortcomings: https://raw.githubusercontent.com/containers/podman/main/rootless.md
- Podman upstream troubleshooting guide: https://github.com/containers/podman/blob/main/troubleshooting.md
- Podman upstream rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md

## Issues Found
- The bind-mount example used `--userns=keep-id` by itself and described it as preserving the user's UID inside the container. Podman's documentation shows that `keep-id` creates the mapping, while the process user should also be set with `--user` when the example depends on running as that UID. Updated the failing command and fix to use `--user "$(id -u):$(id -g)"` with `--userns=keep-id`.
- The `podman unshare chown -R 0:0 ./data` example only maps ownership for container root, which does not fix the shown non-root UID mismatch case. Updated it to chown to the container UID/GID used by the example.
- The named-volume example hard-coded `chown -R 1000:1000`, which is not portable and can map to subordinate host IDs in a default rootless namespace. Updated it to use `--userns=keep-id` and `id -u`/`id -g` so ownership is mapped to the current host user.
- The debug step said "SELinux or AppArmor" but only showed SELinux checks and SELinux volume relabeling options. Updated the label to "SELinux labels" to match the actual commands.

## Review Notes
- `podman` is not installed in the local review environment, so commands were checked against official Podman documentation rather than executed locally.
- The privileged-port sysctl workaround is technically correct, but it is system-wide and allows all unprivileged users to bind at or above the configured low port.
- `podman system reset` is a valid troubleshooting command but destructive; future revisions could add a warning that it removes containers, pods, images, networks, and volumes.

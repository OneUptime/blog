# Validation Summary: How to Migrate Docker Volumes to Podman

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Docker
- Podman
- Container volumes
- Bind mounts
- Linux filesystem permissions
- Shell scripting

## Sources Consulted
- Docker Docs: Volumes, including volume mountpoints, backup, restore, and migration examples: https://docs.docker.com/engine/storage/volumes/
- Docker CLI help: `docker volume ls`, `docker volume inspect`, `docker system df`, and `docker run`
- Podman documentation: `podman volume create`: https://docs.podman.io/en/stable/markdown/podman-volume-create.1.html
- Podman documentation: `podman volume inspect`: https://docs.podman.io/en/latest/markdown/podman-volume-inspect.1.html
- Podman documentation: root storage path defaults: https://docs.podman.io/en/v4.0.0/markdown/podman.1.html
- Podman documentation: `podman volume mount` and rootless `podman unshare` behavior: https://docs.podman.io/en/stable/markdown/podman-volume-mount.1.html
- Podman documentation: `--volume` bind mount syntax and SELinux `:z` / `:Z` relabel options: https://docs.podman.io/en/v4.3/markdown/options/volume.html

## Issues Found
- The rootless Podman storage path was presented only as `~/.local/share/containers/storage`. Updated it to include `$XDG_DATA_HOME/containers/storage`, which Podman may use when `XDG_DATA_HOME` is set.
- The direct filesystem copy example used `*`, which skips dotfiles and can miss hidden top-level files in a volume. Changed it to copy from `_data/.` so all entries are copied.
- The direct filesystem copy example suggested `sudo chown -R $(id -u):$(id -g)` after creating a rootful Podman volume. That can assign rootful volume data to the invoking host user rather than the UID/GID expected by the container. Changed the text to make ownership adjustment conditional and explicit.
- The direct filesystem copy section mixed rootful commands with rootless guidance. Added a short rootless-specific example using `podman unshare`, matching Podman's rootless volume access guidance.
- The bind mount section said the Podman syntax was "exactly the same". The basic `-v` syntax is compatible, but SELinux systems may require `:Z` or `:z` relabel options for container access. Updated the wording and caveat.

## Review Notes
The container-based tar export/import workflow is technically sound and matches Docker's documented backup/restore pattern. The file-count verification script is a useful quick check, but a stronger future improvement would be checksum-based verification for migrations where integrity matters.

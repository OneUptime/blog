# Validation Summary: How to Understand Docker Storage Internals (graph driver, layer store)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine
- Docker storage drivers and graph drivers
- overlay2 and OverlayFS
- containerd image store and overlayfs snapshotter
- Docker image layers and content-addressable storage
- Docker volumes, bind mounts, and tmpfs mounts
- Docker CLI storage inspection and pruning commands

## Sources Consulted
- Docker Docs: OverlayFS storage driver - https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker Docs: Storage drivers - https://docs.docker.com/engine/storage/drivers/
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: docker inspect CLI reference - https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: docker system df CLI reference - https://docs.docker.com/reference/cli/docker/system/df/
- Docker Docs: docker image prune CLI reference - https://docs.docker.com/reference/cli/docker/image/prune/
- Docker Docs: docker system prune CLI reference - https://docs.docker.com/reference/cli/docker/system/prune/
- Local Docker CLI help from Docker 29.4.2 for `docker inspect`, `docker image prune`, `docker system df`, `docker volume prune`, `docker builder prune`, and `docker run`.

## Issues Found
- The post presented `/var/lib/docker/image/overlay2/` metadata paths as universal. Docker Engine 29.0 and later uses the containerd image store by default, and `docker info` may report the `overlayfs` snapshotter instead of the legacy `overlay2` graph driver. Added a version caveat before the path-based examples.
- The mount verification command grepped for the short container ID, but overlay mount paths are based on graph-driver or snapshotter paths and may not include that ID. Changed the example to inspect `MergedDir` and pass that path to `mount` and `findmnt`.
- The writable-layer size examples used `docker inspect` without `--size`. Docker only adds `SizeRw` and `SizeRootFs` when `docker inspect --size` is used. Added `--size` to both commands.
- The volume disk usage grep looked for `VOLUME NAME`, but current `docker system df -v` output uses the `Local Volumes space usage` section header. Updated the grep target.
- The `docker image prune -f` comment incorrectly described the default command as removing all images not referenced by containers. The default removes dangling images; `-a` removes all images not referenced by any container. Updated both comments.
- The `docker system prune -a --volumes -f` comment said it removes everything unused. Current Docker docs specify that `--volumes` prunes anonymous volumes with `docker system prune`; updated the comment to be precise.

## Review Notes
The post is technically relevant and accurate after the fixes. The examples intentionally inspect Docker-managed directories under `/var/lib/docker`; the Docker documentation warns not to directly manipulate those files, so future revisions could add a short warning before the inspection commands.

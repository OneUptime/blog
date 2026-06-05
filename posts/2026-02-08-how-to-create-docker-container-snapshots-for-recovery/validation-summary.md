# Validation Summary: How to Create Docker Container Snapshots for Recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker CLI
- Docker images and containers
- Docker commit, export, import, save, and load
- Docker checkpoint and CRIU
- Docker volumes
- Bash scripting

## Sources Consulted
- Docker Docs: docker container commit - https://docs.docker.com/reference/cli/docker/container/commit/
- Docker Docs: docker container export - https://docs.docker.com/reference/cli/docker/container/export/
- Docker Docs: docker image import - https://docs.docker.com/reference/cli/docker/image/import/
- Docker Docs: docker checkpoint - https://docs.docker.com/reference/cli/docker/checkpoint/
- Docker Docs: docker container start - https://docs.docker.com/reference/cli/docker/container/start/
- Docker Docs: Volumes, including backup and restore examples - https://docs.docker.com/engine/storage/volumes/
- CRIU FAQ: Docker checkpoint filesystem limitation - https://criu.org/index.php?title=FAQ
- Local Docker CLI help output from Docker 29.4.2 for commit, export, import, checkpoint, start, save, load, and pause commands.

## Issues Found
- The Docker checkpoint section implied checkpointing was a complete runtime/container snapshot comparable to a VM snapshot. CRIU does not checkpoint the container filesystem, so I changed the wording and the comparison table to show checkpoint as covering process/memory state but not filesystem or volume data.
- The Docker export section described exporting the entire filesystem. Docker documentation says volume contents are not exported, so I clarified that mounted volume contents are excluded.
- The checkpoint limitations section stated that network connections always get dropped. CRIU/network behavior is more conditional, so I changed this to say active network connections generally need special handling and may not survive restore.
- The full snapshot Bash script used `set -u` but read `$1` before checking whether it existed. I changed it to `${1:-}` so the usage message works.
- The full snapshot script could leave a container paused if a command failed after `docker pause`. I added a cleanup trap that unpauses the container on exit.
- The restore script restored volume archives into new Docker volumes but did not mount those volumes into the restored container. I updated it to read the original mount destinations from the saved inspect JSON with `jq` and pass the restored volume mounts to `docker run`.
- The restore script loop would process a literal glob if there were no volume archives. I enabled `nullglob` so containers without volumes restore cleanly.
- The cleanup script looked for `*_snapshot_*` files, but the snapshot script writes `_image.tar`, `_inspect.json`, and `_vol_*.tar.gz` files. I corrected the `find` patterns and changed `read` to `read -r`.

## Review Notes
The examples remain intentionally simplified for manual Docker recovery workflows. The restore script still asks the reader to recreate ports, networks, and other runtime options from the saved inspect JSON as needed, because fully reconstructing every `docker run` option from `docker inspect` is application-specific.

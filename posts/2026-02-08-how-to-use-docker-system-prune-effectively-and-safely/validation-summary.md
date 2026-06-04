# Validation Summary: How to Use docker system prune Effectively and Safely

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Docker Engine
- Docker CLI prune commands
- Docker volumes, images, containers, networks, and build cache
- Docker Compose service labels
- cron
- systemd timers
- Docker Desktop storage

## Sources Consulted
- Docker CLI reference: `docker system prune` - https://docs.docker.com/reference/cli/docker/system/prune/
- Docker CLI reference: `docker image prune` - https://docs.docker.com/reference/cli/docker/image/prune/
- Docker CLI reference: `docker container prune` - https://docs.docker.com/reference/cli/docker/container/prune/
- Docker CLI reference: `docker volume prune` - https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker CLI reference: `docker network prune` - https://docs.docker.com/reference/cli/docker/network/prune/
- Docker CLI reference: `docker builder prune` - https://docs.docker.com/reference/cli/docker/builder/prune/
- Docker pruning guide: https://docs.docker.com/engine/manage-resources/pruning/
- Docker Desktop settings documentation: https://docs.docker.com/desktop/settings-and-maintenance/settings/
- Local Docker CLI help output from Docker client 29.4.2 for prune command options.

## Issues Found
- `docker system prune --volumes` was described as removing all unused volumes. Current Docker CLI reference and local CLI help specify that this option prunes unused anonymous volumes. Updated the wording and warning comments to say anonymous volumes.
- The most aggressive `docker system prune -a --volumes -f` description said it removes all unused volumes. Updated it to describe stopped containers, unused networks, unused images, unused anonymous volumes, and build cache.
- `docker volume prune` was described as removing unused volumes generally. Current Docker CLI reference says it removes unused anonymous volumes by default, and `docker volume prune -a` removes both anonymous and named unused volumes. Updated the section and added the `-a` example.
- `docker builder prune -a` was described as removing in-use layers. Docker documents it as removing all unused build cache, not just dangling cache. Updated the comment.
- Several `until` filter comments described last-use or stop-time behavior. Docker documents `until` for images, containers, networks, and system prune as creation-time based. Updated those comments to say created before the duration.
- The label-protection text implied the Compose service-label example protects both containers and images. Updated it to distinguish container labels from image labels.
- The monitoring snippet parsed the first `docker system df --format '{{.Size}}'` row as total Docker disk usage, which only reports one row from the resource table. Replaced it with `docker system df` output before the filesystem-capacity check.

## Review Notes
Docker's high-level pruning guide and command reference currently differ in wording around volumes in a few places. The command reference and Docker 29.4.2 CLI help were treated as authoritative for command behavior.

# Validation Summary: How to Identify and Clean Up Unused Volumes in Portainer - Cleanup

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine CLI
- Docker volumes
- Docker Compose
- Bash

## Sources Consulted
- Docker CLI reference: `docker volume ls` - https://docs.docker.com/reference/cli/docker/volume/ls/
- Docker CLI reference: `docker volume prune` - https://docs.docker.com/reference/cli/docker/volume/prune/
- Docker CLI reference: `docker volume inspect` - https://docs.docker.com/reference/cli/docker/volume/inspect/
- Docker CLI reference: `docker container ls` - https://docs.docker.com/reference/cli/docker/container/ls/
- Docker CLI reference: `docker compose down` - https://docs.docker.com/reference/cli/docker/compose/down/
- Docker Engine storage guide: volumes - https://docs.docker.com/engine/storage/volumes/
- Portainer documentation: volumes - https://docs.portainer.io/user/docker/volumes
- Portainer documentation: remove a volume - https://docs.portainer.io/user/docker/volumes/remove

## Issues Found
- The post said `docker volume prune` removes all unused volumes. Current Docker CLI reference says plain `docker volume prune` removes unused anonymous local volumes by default, and `docker volume prune --all` is required to include named volumes. I corrected the prune commands, related comments, and the conclusion.
- The post used `docker volume prune --filter "until=720h"`, but the current CLI reference for `docker volume prune` only documents label-based filters. I removed the unsupported age-filter example and pointed readers to the age-based script later in the post.
- The Portainer walkthrough described identifying unused volumes via a `Containers` column and deleting them via a trash icon or a prune action. Current Portainer docs document an `unused` label/status, warn that external volumes may have limited visibility, and describe removal by selecting the volume and clicking `Remove`. I updated those steps to match the documented UI behavior.
- The development cleanup script could attempt to remove labeled volumes regardless of whether they were still referenced, and it used GNU-specific `xargs -r`. I changed it to use `docker volume prune --all` with label filters and to restrict name-pattern cleanup to dangling volumes only.
- The automated cleanup script’s macOS date fallback did not match the RFC3339 `CreatedAt` format shown in Docker’s volume inspect output. I normalized the timestamp, fixed the BSD `date` format string, and added a skip path for unparseable timestamps.
- The monitoring script claimed to alert on thresholds, but the script did not implement alerting and its `docker system df --format '{{.Size}}' | tail -1` approach was not a reliable way to isolate local-volume usage. I changed it to report estimated total usage by summing per-volume sizes and updated the comments to reflect the actual behavior.
- The explanation about stacks being removed without `--volumes` was too generic. I changed it to the documented `docker compose down --volumes` behavior.

## Review Notes
- Docker’s current CLI reference documents `docker volume prune --all` as API 1.42+, so older engines may not support that flag.
- Portainer’s documentation notes that an `unused` label on external volumes can reflect limited visibility, so CLI verification remains important before deletion.

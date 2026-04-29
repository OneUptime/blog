# Validation Summary: How to Monitor Docker Swarm Cluster Health from Portainer

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Docker Swarm (orchestration, Raft consensus, manager/worker roles)
- Portainer 2.x (Swarm UI, REST API)
- Docker Engine API (`/services` endpoint)
- Prometheus + node-exporter
- Docker Compose v3.8 (Swarm `deploy` keys: `mode: global`, placement constraints)
- `docker node ls` CLI

## Sources Consulted
- Docker Swarm admin guide (Raft / quorum math): https://docs.docker.com/engine/swarm/admin_guide/
- `docker node ls` reference: https://docs.docker.com/reference/cli/docker/node/ls/
- Docker Engine API spec (Moby `swagger.yaml`, `GET /services` operation): https://github.com/moby/moby/blob/master/api/swagger.yaml
- Portainer CE installation docs (default port 9443): https://docs.portainer.io/start/install-ce/server/docker/linux
- Prometheus node_exporter README and `collector/paths.go` (default `--path.procfs` / `--path.sysfs`): https://github.com/prometheus/node_exporter
- Docker Compose deploy reference (`mode: global`): https://docs.docker.com/reference/compose-file/deploy/
- Docker Swarm services / placement constraints: https://docs.docker.com/engine/swarm/services/

## Issues Found

1. **Portainer/Docker API curl missing `?status=true` query parameter.**
   The original snippet called `GET /api/endpoints/1/docker/services` and then `jq`-extracted `.ServiceStatus.RunningTasks` / `.ServiceStatus.DesiredTasks`. Per the Moby `swagger.yaml` spec for the `GET /services` operation, those fields are only populated when the request includes `?status=true`. Without it, both fields are `null` and the example silently fails.
   **Fix:** Quoted the URL and appended `?status=true`, with an inline comment explaining why.

2. **node-exporter compose snippet mounted host `/proc` and `/sys` but never told node-exporter to use them.**
   The snippet mounted `/proc:/host/proc:ro` and `/sys:/host/sys:ro`, but supplied no `command:`. node-exporter's `--path.procfs` / `--path.sysfs` defaults are `/proc` and `/sys` (per `collector/paths.go`), so without the flags the exporter reads the *container's* own procfs/sysfs — defeating the purpose of the bind mounts and reporting container-level metrics rather than host metrics.
   **Fix:** Added `command:` with `--path.procfs=/host/proc` and `--path.sysfs=/host/sys` so the exporter actually uses the mounted host paths.

## Review Notes
- The Raft quorum table ("2 of 3, or 3 of 5"), `docker node ls` MANAGER STATUS values ("Leader" / "Reachable" / "Unreachable"), `mode: global`, and `node.role == manager` placement constraint are all correct against current Docker docs.
- `version: "3.8"` in the compose file is the legacy Compose file format. The modern Compose Specification has dropped the `version` key, but `3.8` is still accepted by Swarm and widely used in tutorials, so it is not an error — just slightly dated.
- For more robust host-metric collection, the official node_exporter README recommends the alternative pattern `--path.rootfs=/host` with `/:/host:ro,rslave` and `--pid=host`. The `--path.procfs` / `--path.sysfs` approach used here is also valid and matches the existing volume mounts with minimal change.
- `prom/prometheus:latest` and `prom/node-exporter:latest` work, but pinning to specific versions in production is generally preferable for reproducibility; this is a style note, not a correctness issue.

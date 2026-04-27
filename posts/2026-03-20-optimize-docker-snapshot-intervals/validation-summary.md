# Validation Summary: How to Optimize Docker Snapshot Intervals for Performance

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer CE
- Docker (Engine API, daemon metrics)
- Docker Compose
- Docker Swarm
- Prometheus (alerting rules, recording rules)
- cAdvisor
- Bash / curl / jq

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer API examples: https://docs.portainer.io/api/examples
- Portainer source for endpoint snapshot handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_snapshot.go
- Portainer source for endpoints snapshots handler: https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_snapshots.go
- Go time.ParseDuration reference (used by --snapshot-interval): https://pkg.go.dev/time#ParseDuration
- Docker daemon metrics docs: https://docs.docker.com/engine/daemon/prometheus/

## Issues Found
1. **Wrong default snapshot interval.** The introduction stated that "By default, Portainer takes a snapshot every 60 seconds." Per the official Portainer CLI docs, the default for `--snapshot-interval` is `5m` (5 minutes). Updated the introduction to reflect the correct default and reframed the "high API load" framing as a consequence of *lowering* the interval rather than the default behavior.
2. **Wrong format for `--snapshot-interval` values.** The post used integer-seconds values like `--snapshot-interval=300`, `--snapshot-interval=600`, etc. The flag accepts a Go `time.ParseDuration` string (e.g. `30s`, `5m`, `1h`), not raw seconds. Updated all flag examples in the docker-compose snippets and the `docker service create` Swarm example to use duration strings (`1m`, `2m`, `5m`, `10m`, `30m`).
3. **Wrong API path for manual snapshot trigger.** The post used `POST /api/endpoints/{id}/docker/snapshot`. The actual route exposed by Portainer (per the source's swagger annotation `@router /endpoints/{id}/snapshot [post]`) is `POST /api/endpoints/{id}/snapshot`. Updated both occurrences in the Step 4 `curl` examples.

## Review Notes
- The use-case recommendation table (Step 3) still uses human-readable "60s / 120s / 300s / 600s / 1800s" strings as descriptors, which is fine for a reference table. The actual CLI flag values shown elsewhere in the post are now in proper Go duration form.
- The `1440 polls per day` arithmetic for a 60-second interval is correct (24 × 60 = 1440), and is now framed as an aggressive low-interval scenario rather than the default.
- The `engine_daemon_http_requests_total` metric requires Docker daemon experimental metrics-addr to be enabled (via `/etc/docker/daemon.json` `metrics-addr` and `experimental: true`). The post implies this with "With Docker metrics enabled" but does not show the daemon configuration - readers may need to consult the Docker daemon Prometheus docs to actually see those metrics on port 9323.
- The Portainer Business Edition explicitly supports manual snapshot triggers; Portainer CE also exposes `POST /api/endpoints/{id}/snapshot`, so the example will work on both editions at the time of review.
- `version: "3.8"` in the Compose files is harmless but the `version` key is informational only in modern Compose (Docker Compose v2 ignores it). Not changed since it does not affect correctness.

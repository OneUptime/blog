# Validation Summary: How to Build a Container Metrics Dashboard with Grafana and Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (stack deployment)
- Docker Compose (v3.8 schema)
- Prometheus (scrape config, TSDB retention)
- Grafana (dashboard import)
- cAdvisor (container metrics exporter)
- Node Exporter (host metrics exporter)
- PromQL (queries)

## Sources Consulted
- Prometheus official docs - configuration and storage flags: https://prometheus.io/docs/prometheus/latest/configuration/configuration/ and https://prometheus.io/docs/prometheus/latest/storage/
- Grafana docs - environment variables (`GF_SECURITY_ADMIN_PASSWORD`): https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- cAdvisor official repo - Docker run mounts and image location (`gcr.io/cadvisor/cadvisor`): https://github.com/google/cadvisor
- Node Exporter official repo - recommended Docker compose config with `--path.procfs`, `--path.sysfs`, `--path.rootfs`, and the filesystem mount-points exclude regex: https://github.com/prometheus/node_exporter
- Grafana dashboard catalog - dashboard 1860 "Node Exporter Full" by rfraile: https://grafana.com/grafana/dashboards/1860
- Grafana dashboard catalog - dashboard 14282 (Docker / cAdvisor monitoring): https://grafana.com/grafana/dashboards/14282
- cAdvisor metric reference (`container_cpu_usage_seconds_total`, `container_memory_usage_bytes`, `container_network_receive_bytes_total`, `container_last_seen`): https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Docker Compose file reference (v3.8 schema, `expose`, `pid`, `volumes`): https://docs.docker.com/compose/compose-file/

## Issues Found
- **node-exporter container was missing host bind mounts and path flags.** As originally written, the `node-exporter` service had no volumes, no `pid: host`, and no `--path.*` command flags. The official Node Exporter project explicitly recommends running on the host or, when run in a container, mounting `/proc`, `/sys`, and `/` and pointing the collector at them via `--path.procfs=/host/proc`, `--path.sysfs=/host/sys`, and `--path.rootfs=/rootfs`. Without these, node-exporter reports the container's own namespaced view (CPU/memory/disk for the container) instead of the host, which makes dashboard 1860 ("Node Exporter Full") show meaningless data — the opposite of what the post is trying to demonstrate. Fixed by adding `pid: host`, the three read-only bind mounts, the three `--path.*` flags, and the standard `--collector.filesystem.mount-points-exclude` regex (with `$$` to escape `$` inside Compose). This matches the configuration documented in the upstream `prometheus/node_exporter` README.

## Review Notes
- The compose file uses `version: "3.8"`, which is technically obsolete in Docker Compose v2+ (the field is now ignored). It still works and triggers only a warning, so no change needed, but in a future revision the line could be removed.
- cAdvisor's mount set (`/`, `/var/run`, `/sys`, `/var/lib/docker`) is the documented minimum and is fine. Some setups also add `/dev/disk/:/dev/disk:ro` for richer per-device disk stats, but it is optional.
- `GF_SECURITY_ADMIN_PASSWORD=changeme` is fine for a tutorial; in production this should be sourced from a secret rather than hard-coded in the stack file.
- Prometheus scrape job names (`cadvisor`, `node`) are fine; some community dashboards expect `job="node"` (which matches), so dashboard 1860 should label-match without further changes.
- The PromQL examples are correct and use current cAdvisor metric names.

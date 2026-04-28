# Validation Summary: How to Deploy Node Exporter for Host Metrics with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus Node Exporter
- Portainer (Docker container management UI)
- Docker Compose (stack format)
- Prometheus (scrape configuration, reload API)
- PromQL
- Grafana (dashboard import)
- UFW (firewall)

## Sources Consulted
- Prometheus Node Exporter official repository: https://github.com/prometheus/node_exporter
- Grafana Dashboards page for Node Exporter Full (ID 1860): https://grafana.com/grafana/dashboards/1860
- Knowledge of Prometheus / PromQL function semantics (`irate`, `avg by`)
- Knowledge of Docker Compose `pid: host`, `network_mode: host`, and `$$` escape syntax

## Issues Found
No technical issues found.

The Docker Compose stack is valid:
- `image: prom/node-exporter:latest`, `pid: host`, `network_mode: host`, and the bind mounts (`/proc`, `/sys`, `/`) match Node Exporter's documented recommended deployment.
- Flags `--path.procfs`, `--path.sysfs`, `--path.rootfs`, `--collector.filesystem.mount-points-exclude`, and the explicit `--collector.*` enable flags are all valid current flag names.
- The `$$` escape in the mount-points-exclude regex is the correct way to emit a literal `$` inside a docker-compose command string.

Default port `9100` is correct.

Metric names are all current and accurate (`node_cpu_seconds_total`, `node_memory_MemTotal_bytes`, `node_memory_MemAvailable_bytes`, `node_disk_read_bytes_total`, `node_disk_written_bytes_total`, `node_network_receive_bytes_total`, `node_network_transmit_bytes_total`, `node_filesystem_avail_bytes`, `node_load1`, `node_load5`).

PromQL queries are correct:
- CPU usage via `100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)` is the standard idiom.
- Memory and disk usage formulas match commonly published Node Exporter recipes.

Grafana dashboard ID **1860** is indeed "Node Exporter Full" maintained at github.com/rfmoz/grafana-dashboards (matches the post's attribution to rfmoz).

## Review Notes
- The `curl -X POST http://localhost:9090/-/reload` example requires Prometheus to have been started with `--web.enable-lifecycle`. The post does not explicitly mention this prerequisite; readers running Prometheus with the default startup flags will receive an HTTP 405 error. Not technically incorrect, but a noteworthy caveat.
- The Compose `version: "3.8"` field is no longer required by modern Docker Compose (it is treated as obsolete and ignored). Still works, just informational.
- Listing default-enabled collectors explicitly (`--collector.netstat`, `--collector.meminfo`, `--collector.diskstats`, `--collector.loadavg`) is redundant since they are on by default — harmless, but unnecessary unless paired with `--collector.disable-defaults`.
- The sample `/metrics` output shows a blank line between `# HELP` and `# TYPE`, which differs slightly from real output where they are adjacent. Cosmetic only.
- `host.docker.internal` resolves on Docker Desktop and on Linux Docker Engine 20.10+ when the container is started with `--add-host=host.docker.internal:host-gateway`. The post's inline comment "# Docker Desktop" already flags the limitation.

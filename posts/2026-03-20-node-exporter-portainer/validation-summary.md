# Validation Summary: How to Set Up Node Exporter for Host Metrics with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus Node Exporter
- Portainer (Docker stack deployment)
- Docker Compose
- Prometheus (scrape configs, alerting rules)
- Grafana (dashboard import)

## Sources Consulted
- Prometheus Node Exporter README and flag reference (https://github.com/prometheus/node_exporter)
- Node Exporter Docker deployment guidance (recommended host volume mounts and `--path.*` flags)
- Docker Compose specification — variable interpolation / `$$` escaping
- Prometheus configuration documentation — `scrape_configs`, `relabel_configs`, replacement syntax (https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- Prometheus alerting rules documentation (https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- Grafana.com dashboard 1860 "Node Exporter Full" (https://grafana.com/grafana/dashboards/1860)

## Issues Found
No technical issues found.

Verification notes:
- `prom/node-exporter:latest` is the correct official image; default port 9100 is correct.
- Volume mounts `/proc:/host/proc:ro`, `/sys:/host/sys:ro`, `/:/rootfs:ro` match the project's recommended Docker mounts.
- All command flags are valid in current Node Exporter releases:
  - `--path.procfs`, `--path.rootfs`, `--path.sysfs` are correct.
  - `--collector.filesystem.mount-points-exclude` is the current flag name (replaced the older `--collector.filesystem.ignored-mount-points`).
  - `--collector.systemd` and `--collector.processes` correctly enable the optional systemd and processes collectors.
- The `$$` in the regex is correctly escaped for Docker Compose variable interpolation (Compose substitutes `$$` to a literal `$`).
- `pid: host` is valid Compose syntax and is appropriate for accurate host-level process metrics.
- Metric names referenced (`node_cpu_seconds_total`, `node_memory_MemAvailable_bytes`, `node_memory_MemTotal_bytes`, `node_disk_io_time_seconds_total`, `node_filesystem_avail_bytes`, `node_filesystem_size_bytes`) are all current Node Exporter metrics.
- Alert PromQL expressions are syntactically and semantically correct (CPU load via idle inversion, available/size ratio for disk and memory).
- Prometheus `relabel_configs` `${1}` replacement syntax is valid (Prometheus accepts both `$1` and `${1}`).
- Grafana dashboard ID `1860` correctly identifies "Node Exporter Full".

## Review Notes
- The post uses `image: prom/node-exporter:latest`. Pinning to a specific version (e.g., `prom/node-exporter:v1.8.2`) is generally recommended in production for reproducibility, but `:latest` is acceptable for a tutorial.
- The filesystem mount-points exclusion regex covers the basic pseudo-filesystems. In production deployments running container engines, additional excludes for paths like `/var/lib/docker` are sometimes added; the post's simpler regex is fine for the introductory scope.
- The alert rules omit `labels` and `annotations`. These fields are optional in Prometheus alerting rules and the rules remain valid as-is, but adding severity labels and summary/description annotations is a common best practice.
- The Prometheus scrape `targets: ['node-exporter:9100']` assumes Prometheus is on the same Docker network as Node Exporter (the `monitoring` external network defined in the stack), which is consistent with the post's deployment model.

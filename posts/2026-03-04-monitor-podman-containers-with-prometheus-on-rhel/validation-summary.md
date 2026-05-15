# Validation Summary: How to Monitor Podman Containers with Prometheus on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Podman
- Podman Docker-compatible API
- Prometheus
- cAdvisor
- node_exporter textfile collector
- systemd services and timers
- PromQL
- Grafana

## Sources Consulted
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman stats documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- cAdvisor running documentation: https://github.com/google/cadvisor/blob/master/docs/running.md
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- cAdvisor latest release page: https://github.com/google/cadvisor/releases/tag/v0.56.2
- node_exporter textfile collector documentation: https://github.com/prometheus/node_exporter/blob/master/README.md

## Issues Found
- The cAdvisor container command used the old `gcr.io/cadvisor/cadvisor:latest` image reference. Updated it to the current GitHub Container Registry image `ghcr.io/google/cadvisor:v0.56.2` and added `/dev/kmsg`, matching the current cAdvisor run guidance.
- The Podman API verification command used `http://d/v4.0.0/containers/json`, which does not match Podman's documented Docker-compatible API version. Updated it to `http://d/v1.40/containers/json`.
- The post described the Podman socket as a built-in metrics API. Adjusted the wording to Docker-compatible API because Prometheus-format metrics still require an exporter or conversion layer.
- The textfile exporter script read non-existent uppercase keys from `podman stats --no-stream --format json`. Podman's documented JSON output uses lowercase keys such as `name`, `cpu_percent`, `mem_usage`, and `pids`. Updated the script accordingly.
- The textfile exporter emitted a placeholder memory info metric instead of memory usage. Updated it to emit `podman_container_memory_usage_bytes` by converting Podman's human-readable memory usage to bytes.
- The textfile exporter wrote directly to the final `.prom` file. Updated it to write to a temporary file and move it into place, matching node_exporter's documented textfile collector pattern.

## Review Notes
- I could not run Podman locally in this workspace because the `podman` binary is not installed, so command behavior was verified against official Podman documentation and the Python conversion logic was tested with documented sample JSON.
- `sudo systemctl reload prometheus` is commonly valid for packaged services, but upstream Prometheus documents reloads in terms of `SIGHUP` or the `/-/reload` endpoint when lifecycle support is enabled.

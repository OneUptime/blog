# Validation Summary: How to Implement Container Monitoring Best Practices with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman health checks
- Podman Quadlet
- Prometheus
- Prometheus alerting rules and PromQL
- cAdvisor
- Node Exporter
- Grafana
- Node.js / Express
- prom-client
- Python prometheus_client
- Containerfile / Dockerfile health checks

## Sources Consulted
- Podman `podman stats` documentation: https://docs.podman.io/en/latest/markdown/podman-stats.1.html
- Podman `podman run` health check options: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman healthcheck run` documentation: https://docs.podman.io/en/latest/markdown/podman-healthcheck-run.1.html
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/2.54/configuration/alerting_rules/
- Prometheus cAdvisor guide: https://prometheus.io/docs/guides/cadvisor/
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Prometheus Node Exporter container guidance: https://github.com/prometheus/node_exporter
- Grafana Docker image documentation: https://grafana.com/docs/grafana/latest/installation/docker/
- prom-client package documentation: https://github.com/siimon/prom-client
- Python prometheus_client documentation: https://prometheus.github.io/client_python/

## Issues Found
- The Containerfile used `curl` in `HEALTHCHECK` while starting from `node:20-alpine`, which does not include curl by default. Added `RUN apk add --no-cache curl`.
- The Prometheus setup wrote `~/monitoring/prometheus.yml` before ensuring `~/monitoring` existed. Added `mkdir -p ~/monitoring`.
- The Prometheus scrape configuration targeted `cadvisor:8080`, but the stack did not start a cAdvisor container. Added a cAdvisor `podman run` command with the host mounts needed for container metrics.
- The Prometheus configuration did not load the alert rule file. Added `rule_files`, mounted `alerts.yml`, created an initial empty rule file, and added a reload command after updating rules.
- The `ContainerHighCPU` alert compared `container_cpu_usage_seconds_total` directly to a threshold even though it is a cumulative counter. Changed it to use `rate(...[5m])` aggregated by container name.
- The `ContainerRestarting` alert used `container_restart_count`, which is not a cAdvisor metric listed in the official cAdvisor Prometheus metrics documentation. Changed it to use `changes(container_start_time_seconds{name!=""}[1h])`.
- The Quadlet example used `Network=monitoring.network` without providing a corresponding `.network` unit. Changed it to `Network=monitoring` to match the manually created Podman network.
- The Quadlet example used `~` in `Volume=`, which is not shell-expanded in a Quadlet file. Changed it to the systemd `%h` home-directory specifier and added the alerts file mount.

## Review Notes
Podman was not installed in the local environment, so CLI validation was performed against the official Podman documentation rather than local `--help` output. The post now validates technically, but a production-ready deployment should pin container image versions instead of using `latest` and should avoid the example Grafana admin password.

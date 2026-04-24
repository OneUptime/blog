# Validation Summary: How to Deploy Prometheus and Grafana via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Compose
- Prometheus
- Grafana
- Prometheus Node Exporter
- cAdvisor

## Sources Consulted
- Portainer docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add
- Portainer docs: Relative path support - https://docs.portainer.io/sts/advanced/relative-paths
- Docker docs: Version and name top-level elements - https://docs.docker.com/reference/compose-file/version-and-name/
- Prometheus docs: Configuration - https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus docs: Prometheus command-line flags - https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus docs: Monitoring Linux host metrics with the Node Exporter - https://prometheus.io/docs/guides/node-exporter/
- Prometheus Node Exporter README - https://github.com/prometheus/node_exporter
- cAdvisor README - https://github.com/google/cadvisor
- cAdvisor releases - https://github.com/google/cadvisor/releases
- Grafana docs: Configure Grafana - https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana dashboard library: Node Exporter Full (1860) - https://grafana.com/grafana/dashboards/1860-node-exporter-full/
- Grafana dashboard library: Docker and system monitoring (893) - https://grafana.com/grafana/dashboards/893

## Issues Found
- The compose snippet mounted `./prometheus.yml`, but the post instructed readers to create `/opt/monitoring/prometheus.yml`. Portainer only supports relative path volumes for Git-based deployments with relative path support enabled, so the original web-editor workflow would not work as written. I changed the bind mount to `/opt/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro`.
- The Prometheus container used `--storage.tsdb.retention.time=30d`, which current Prometheus documentation marks as deprecated. I moved retention to the config file under `storage.tsdb.retention.time: 30d`.
- The cAdvisor image reference used `gcr.io/cadvisor/cadvisor:latest`. Current upstream cAdvisor guidance uses the GitHub Container Registry with a release tag, so I updated it to `ghcr.io/google/cadvisor:v0.55.0`.
- The compose snippet included a top-level `version: "3.8"` field. Docker now documents the Compose `version` field as obsolete, so I removed it.
- The Grafana access note could be read as using the literal text `GRAFANA_PASSWORD` as the password. I clarified that the login uses the value assigned to that environment variable.

## Review Notes
- The embedded YAML snippets were re-parsed locally after the edits and passed syntax validation.
- Dashboard IDs `1860` and `893` currently exist in Grafana's dashboard library, but they are community dashboards and compatibility can change over time. ID `893` is older than many newer forks.

# Validation Summary: How to Deploy the Grafana-Prometheus-Loki Stack via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Docker stack management)
- Docker Compose (`version: "3.8"`)
- Grafana
- Prometheus
- Loki 3.0.0
- Promtail 3.0.0
- Node Exporter
- cAdvisor

## Sources Consulted
- Prometheus CLI flags reference: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Loki release notes / image registry: https://hub.docker.com/r/grafana/loki and https://grafana.com/docs/loki/latest/
- Promtail configuration: https://grafana.com/docs/loki/latest/send-data/promtail/
- Node Exporter flags: https://github.com/prometheus/node_exporter
- cAdvisor docs: https://github.com/google/cadvisor (image `gcr.io/cadvisor/cadvisor`)
- Grafana provisioning (datasources + dashboards): https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana community dashboards verified via grafana.com:
  - https://grafana.com/grafana/dashboards/1860 — "Node Exporter Full"
  - https://grafana.com/grafana/dashboards/14282 — "Cadvisor exporter"
  - https://grafana.com/grafana/dashboards/13639 — "Logs / App" (Loki log viewer)

## Issues Found
1. **Missing port publishing for Prometheus and Loki.** The "Accessing the Stack" table told users to reach Prometheus at `http://server:9090` and Loki at `http://server:3100`, but the original Compose definition did not publish those ports — they were only reachable inside the Docker bridge network. Added `ports: ["9090:9090"]` to the `prometheus` service and `ports: ["3100:3100"]` to the `loki` service so the access URLs in the table actually work as documented.

## Review Notes
- All Prometheus, Node Exporter, and cAdvisor command-line flags used (`--config.file`, `--storage.tsdb.path`, `--storage.tsdb.retention.time`, `--web.enable-lifecycle`, `--path.procfs`, `--path.rootfs`, `--path.sysfs`) are current and correct.
- Loki/Promtail 3.0.0 are valid pinned versions and the default config paths (`/etc/loki/local-config.yaml`, `/etc/promtail/config.yml`) are correct.
- Grafana datasource and dashboard provisioning YAML formats (`apiVersion: 1`) are correct.
- All three community dashboard IDs (1860, 14282, 13639) were verified as valid on grafana.com and match the descriptions given in the post.
- Minor caveats (not changed, since they are not technical errors):
  - `version: "3.8"` is now informational/obsolete in modern Compose v2 but does not break anything.
  - Promtail is in long-term maintenance in favor of Grafana Alloy as of late 2024; using it is still fully supported but newer projects may prefer Alloy.
  - The Compose file references `./promtail-config.yml` as a bind mount but the post does not provide an example `promtail-config.yml`. Users will need to supply one (e.g., the upstream `clients` + `scrape_configs` example) before bringing the stack up.
  - Pinning `prom/prometheus`, `prom/node-exporter`, `gcr.io/cadvisor/cadvisor`, and `grafana/grafana` to explicit version tags rather than `:latest` would be more reproducible.

# Validation Summary: How to Build a Node Metrics Dashboard in Grafana with Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (Docker stack management)
- Docker Compose
- Prometheus (metrics collection, PromQL, scrape config)
- Grafana (dashboards, data sources, alerting)
- node_exporter (host metrics)
- cAdvisor (container metrics)

## Sources Consulted
- Prometheus docs — `https://prometheus.io/docs/prometheus/latest/configuration/configuration/`
- Prometheus storage flags — `https://prometheus.io/docs/prometheus/latest/storage/`
- node_exporter README and metric names — `https://github.com/prometheus/node_exporter`
- cAdvisor docker-compose example — `https://github.com/google/cadvisor`
- Grafana Docker image env vars — `https://grafana.com/docs/grafana/latest/setup-grafana/configure-docker/`
- Grafana 10+ navigation (Connections → Data sources) — `https://grafana.com/docs/grafana/latest/datasources/`
- Grafana community dashboard 1860 "Node Exporter Full" — `https://grafana.com/grafana/dashboards/1860`
- Docker `extra_hosts` / `host-gateway` reference — `https://docs.docker.com/reference/compose-file/services/#extra_hosts`
- Common PromQL recipes (CPU/memory/disk/network) cross-checked against node_exporter metric definitions

## Issues Found

1. **Broken Prometheus → node_exporter scrape target.** The compose file runs `node-exporter` with `network_mode: host` while `prometheus` runs on the default bridge network. The original `prometheus.yml` used `targets: ['localhost:9100']`, which from inside the Prometheus container resolves to Prometheus's own loopback — node_exporter is unreachable that way. Fixed by:
   - Adding `extra_hosts: ["host.docker.internal:host-gateway"]` to the `prometheus` service so the Docker-provided gateway alias resolves on Linux as well as Docker Desktop.
   - Changing the scrape target to `host.docker.internal:9100`, which routes to the host network where node_exporter is listening.

2. **Outdated Grafana data source navigation.** The post said "Configuration > Data Sources", which was the path in Grafana 9 and earlier. Since the stack pulls `grafana/grafana:latest` (Grafana 10+/11.x), the path is now "Connections > Data sources". Updated step 3 of "Configure Grafana Data Source" accordingly.

## Review Notes
- The PromQL queries (CPU idle subtraction, memory `MemAvailable / MemTotal`, filesystem availability, irate on `node_network_*`, `node_load1/5/15`, and `count(container_last_seen{name!=""})`) all match current node_exporter and cAdvisor metric names and standard recipes.
- `--storage.tsdb.retention.time=15d` matches Prometheus's documented default retention of 15 days.
- The `version: "3.8"` Compose key is harmless but is now obsolete in the Compose Specification — newer Compose ignores it. Not worth changing in this post.
- cAdvisor's compose snippet works for most setups but on some hosts may need `privileged: true` and `devices: ["/dev/kmsg"]` to read all metrics; left as-is since the basic container/host metrics this post relies on still populate.
- For maximum portability, an alternative to `host.docker.internal:host-gateway` would be to drop `network_mode: host` from node_exporter and scrape it via the compose service name. The current minimal fix preserves the author's chosen topology.

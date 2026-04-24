# Validation Summary: How to Deploy the Grafana-Prometheus-Loki Stack via Portainer (2)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Compose / Portainer stacks
- Grafana
- Prometheus
- Alertmanager
- Grafana Loki
- Grafana Alloy
- Prometheus Node Exporter
- cAdvisor

## Sources Consulted
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer relative path volumes docs: https://docs.portainer.io/sts/advanced/relative-paths
- Docker Compose services reference (`extra_hosts`, bind mounts, network modes): https://docs.docker.com/reference/compose-file/services/
- Docker host-gateway reference: https://docs.docker.com/reference/cli/dockerd/
- Grafana Docker installation docs: https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/
- Grafana provisioning docs: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configuration/
- Grafana Loki configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Promtail deprecation notice: https://grafana.com/docs/loki/latest/send-data/promtail/stages/docker/
- Grafana Alloy Docker install docs: https://grafana.com/docs/alloy/latest/set-up/install/docker/
- Grafana Alloy Docker log collection docs: https://grafana.com/docs/alloy/latest/monitor/monitor-docker-containers/
- Grafana Alloy `loki.source.docker` reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.docker/
- Grafana Alloy `loki.write` reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.write/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules reference: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Node Exporter README: https://github.com/prometheus/node_exporter
- cAdvisor Docker run docs: https://github.com/google/cadvisor/blob/master/docs/running.md
- Grafana dashboard 1860: https://grafana.com/grafana/dashboards/1860-node-exporter-full/

## Issues Found
- The original stack used relative bind mounts such as `./prometheus.yml` without noting that Portainer's relative path volume support is limited to Git-based deployments with the feature enabled in Portainer Business Edition. I changed the compose example and file paths to absolute host paths under `/opt/observability` so the stack can be deployed from Portainer in the general case.
- Prometheus was configured to scrape `localhost:9100` for Node Exporter. From inside the Prometheus container, `localhost` refers to the Prometheus container itself, not the host-networked exporter. I updated Node Exporter to the current documented host-monitoring container pattern and changed Prometheus to scrape `host.docker.internal:9100`, with the matching host-gateway mapping on the Prometheus service.
- The Grafana container used `GF_INSTALL_PLUGINS`, while current Grafana Docker documentation uses `GF_PLUGINS_PREINSTALL` for startup-time plugin installation. I updated the environment variable accordingly.
- The cAdvisor example used the legacy `gcr.io/cadvisor/cadvisor` image reference and mounted `/var/run` read-only. Current cAdvisor documentation uses `ghcr.io/google/cadvisor`, and the default Docker run example mounts `/var/run` read-write. I corrected both.
- The post referenced required files that were never actually defined: `loki-config.yaml`, `promtail-config.yaml`, `alertmanager.yml`, and `alert-rules.yml`. I added complete starter configurations so the stack is self-contained.
- The post used Promtail in a guide dated after Promtail's end-of-life. Grafana documents Promtail as deprecated and EOL on March 2, 2026. I replaced Promtail with Grafana Alloy and added a working `alloy-config.alloy` example based on the current Alloy Loki components.
- The original conclusion implied the alerting path was fully ready immediately, but the post had no valid starter Alertmanager configuration. I added a minimal receiver configuration and clarified that users must replace the placeholder receiver with a real notification integration before relying on alerts.

## Review Notes
- The stack still uses `:latest` image tags. They are valid, but pinning specific versions would make the tutorial more reproducible over time.
- The Node Exporter container uses `network_mode: host`, which matches the documented host-monitoring pattern for Dockerized Node Exporter. This is primarily intended for Linux Docker hosts.
- The Grafana dashboard provisioning directory is mounted, but the post still imports dashboard ID 1860 manually. That is technically fine; the mounted dashboards directory can remain empty unless the user also wants file-based dashboard provisioning.

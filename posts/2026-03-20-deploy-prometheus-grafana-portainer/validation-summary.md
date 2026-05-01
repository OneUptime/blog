# Validation Summary: How to Deploy Prometheus and Grafana with Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Compose
- Prometheus
- Grafana
- Docker volumes

## Sources Consulted
- Prometheus installation docs: https://prometheus.io/docs/prometheus/latest/installation/
- Prometheus configuration docs: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Dockerfile: https://github.com/prometheus/prometheus/blob/main/Dockerfile
- Prometheus sample `prometheus.yml`: https://github.com/prometheus/prometheus/blob/main/documentation/examples/prometheus.yml
- Prometheus command-line flags: https://github.com/prometheus/prometheus/blob/main/docs/command-line/prometheus.md
- Grafana Docker configuration docs: https://grafana.com/docs/grafana/latest/setup-grafana/configure-docker/
- Grafana data sources docs: https://grafana.com/docs/grafana/latest/datasources/
- Grafana Prometheus data source guide: https://grafana.com/docs/learning-paths/prometheus/add-data-source/
- Grafana dashboard import docs: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/import-dashboards/
- Grafana dashboard 3662: https://grafana.com/grafana/dashboards/3662-prometheus-2-0-overview/
- Docker Compose networking docs: https://docs.docker.com/reference/compose-file/networks/
- Docker volumes docs: https://docs.docker.com/engine/storage/volumes/
- Portainer stack docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true

## Issues Found
- The original stack included Alertmanager plus a Prometheus `alerting` block, but the post never configured alerting rules or an Alertmanager receiver configuration. I removed those pieces so the post only documents the services it actually deploys and configures.
- The original Prometheus configuration referenced `node-exporter` and `cadvisor`, and the dashboard recommendations depended on those exporters, but the stack never deployed either service. I removed the unsupported scrape targets and dashboard IDs.
- The post instructed readers to write `prometheus.yml` into a named volume. That step was unnecessary for this tutorial because the official Prometheus image already ships with a sample `prometheus.yml` and the stack was not otherwise providing the extra exporters it referenced. I removed that section and aligned the stack with the image defaults.
- The Grafana navigation path was outdated. Current Grafana docs use `Connections` -> `Data sources` -> `Add new data source`, so I updated the instructions.
- Dashboard ID `3662` is currently titled `Prometheus 2.0 Overview`, not `Prometheus 2.0 Stats`. I corrected the name.
- The stack used `--storage.tsdb.retention.time=30d`, which current Prometheus command-line docs mark as deprecated in favor of config-file-based retention settings. I removed the deprecated flag.
- The stack required `GRAFANA_PASSWORD` but the post did not tell readers to set it. I added a Compose default and updated the login instructions so the example is deployable as written.

## Review Notes
- The post now accurately covers a basic Prometheus and Grafana deployment that uses the Prometheus image's bundled sample configuration for self-scraping.
- `depends_on` only controls startup order, not application readiness. That is acceptable here because readers add the Grafana data source manually after both containers start.
- A local `docker compose config` validation run was not possible in this environment because Docker is not installed.

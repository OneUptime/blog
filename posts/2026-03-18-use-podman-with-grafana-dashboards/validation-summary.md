# Validation Summary: How to Use Podman with Grafana for Dashboards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Grafana
- Prometheus
- Prometheus Node Exporter
- Grafana provisioning
- Grafana HTTP API
- JSON dashboard definitions
- YAML Compose and Prometheus configuration

## Sources Consulted
- Podman compose documentation: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman volume export documentation: https://docs.podman.io/en/stable/markdown/podman-volume-export.1.html
- Podman volume import documentation: https://docs.podman.io/en/latest/markdown/podman-volume-import.1.html
- Podman run documentation (`--restart`): https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Grafana Docker installation documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/
- Grafana configuration documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana backup documentation: https://grafana.com/docs/grafana/latest/administration/back-up-grafana/
- Grafana HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/
- Grafana Dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Grafana service accounts documentation: https://grafana.com/docs/grafana/latest/administration/service-accounts/
- Grafana dashboard sharing documentation: https://grafana.com/docs/grafana/latest/dashboards/share-dashboards-panels/
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/
- Prometheus cAdvisor guide: https://prometheus.io/docs/guides/cadvisor/
- Prometheus Node Exporter README: https://github.com/prometheus/node_exporter/blob/master/README.md?plain=1

## Issues Found
- The post used `podman-compose`, while current Podman documentation centers on `podman compose`. I updated the command and clarified that it relies on an external Compose provider.
- The `node-exporter` service definition did not match the current containerized host-monitoring guidance. I changed it to mount the host root filesystem and use `--path.rootfs=/host`, which is the documented pattern for containerized host monitoring.
- The stack mounted `prometheus/prometheus.yml` but never showed a valid scrape configuration. I added a minimal Prometheus configuration that scrapes Prometheus itself and Node Exporter.
- The provisioning example created a Loki data source even though the stack never deployed a Loki service. I removed the Loki data source so the example matches the actual stack.
- The original "Container Monitoring" dashboard queried `container_*` metrics, but the provided stack only exposed `node_*` metrics from Node Exporter. I replaced that dashboard with a host-monitoring dashboard backed by Node Exporter metrics so the example works with the stack as written.
- The dashboard JSON examples were missing key metadata commonly required for reliable provisioning, such as `uid`, `schemaVersion`, `version`, and `overwrite`. I added those fields and standard time/refresh settings.
- The post used `GF_ALERTING_ENABLED`, which is not the current Grafana setting for unified alerting. I changed it to `GF_UNIFIED_ALERTING_ENABLED`.
- The backup script used service authentication wording that was outdated for current Grafana guidance and relied on legacy dashboard API endpoints. I changed it to use a service account token and the current `/apis/dashboard.grafana.app/v1/...` dashboard API.
- The backup snippet exported the Grafana volume while Grafana was still running. Grafana's backup guidance recommends shutting down SQLite-backed instances before backing up the database, so I added `podman stop` and `podman start` around the volume export.
- The restore snippet recreated the volume and then restarted Grafana, which did not line up with the rest of the example. I changed it to stop Grafana, import the saved volume contents, and start Grafana again.
- The post referred to a "Grafana embedding API". I removed that wording and kept the supported iframe-based embedding guidance.

## Review Notes
- The examples still use `:latest` image tags. This is technically valid and matches vendor examples, but version pinning would be safer for reproducible production deployments.
- The backup example assumes the default Grafana namespace (`default`) in the current dashboard HTTP API.
- If the author wants true per-container `container_*` metrics later, the stack will need an additional container metrics exporter such as cAdvisor or another Podman-aware exporter. Node Exporter only provides host-level `node_*` metrics.

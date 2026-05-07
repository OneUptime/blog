# Validation Summary: How to Use Podman with Prometheus for Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Prometheus
- PromQL
- Node Exporter
- Prometheus Podman Exporter
- Alertmanager
- Compose
- Flask
- Python `prometheus_client`

## Sources Consulted
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman hostname behavior for `host.containers.internal`: https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- Podman compose documentation: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Node Exporter README: https://github.com/prometheus/node_exporter
- Prometheus Podman Exporter README: https://github.com/containers/prometheus-podman-exporter
- Prometheus Podman Exporter install guide: https://github.com/containers/prometheus-podman-exporter/blob/main/install.md
- Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Prometheus Python client Flask documentation: https://prometheus.github.io/client_python/exporting/http/flask/

## Issues Found
- The original Prometheus scrape target for Node Exporter used `node-exporter:9100`, which would not resolve from the standalone Prometheus container layout shown in the post. It was changed to `host.containers.internal:9100` to match Podman’s documented host-access pattern.
- The standalone Node Exporter command did not follow the current documented containerized host-monitoring pattern and included a shell-unsafe regex using `$$`, which would expand to the shell PID. It was replaced with the current documented `--path.rootfs=/host` pattern and the current recommended image reference.
- The Podman exporter section implied Podman directly exposed Prometheus metrics and omitted required container-image options from the exporter’s own installation guide. The command was corrected to include `CONTAINER_HOST`, the Podman socket mount, `--security-opt label=disable`, rootless user namespace mapping, and `--collector.enhance-metrics`.
- The Compose example mixed Podman exporter guidance with an unrelated cAdvisor service and used an obsolete top-level `version` field. The stack was simplified to Prometheus, Node Exporter, and Alertmanager, and Node Exporter was updated to the documented host-monitoring configuration.
- The application scrape target and Alertmanager target used container DNS names that were not consistent with the standalone Prometheus deployment shown earlier. They were updated to `host.containers.internal` endpoints so the examples match the documented network path.
- The alert rules and PromQL examples referenced cAdvisor metric families (`container_*`) that were never configured by the post, used a non-existent restart metric, and had an incorrect error-rate expression. They were updated to the current Podman exporter metric names, a restart detection based on `changes(podman_container_started_seconds[1h])`, correct `histogram_quantile` aggregation, correct error-rate aggregation, and a true network I/O example that includes both input and output.

## Review Notes
- The examples now consistently assume Prometheus is running in its own Podman container and reaches host-published services through `host.containers.internal`.
- `podman compose` is a thin wrapper around an external compose provider, so the Compose file syntax is only part of the runtime story; an installed provider is still required.
- The Flask example is valid for a simple single-process app. Production multiprocess WSGI deployments would need the Prometheus Python client’s multiprocess guidance.

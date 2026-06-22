# Validation Summary: How to Configure Observability Stack

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus
- Grafana
- Loki
- Grafana Alloy
- Tempo
- OpenTelemetry JavaScript
- Winston
- Kubernetes service discovery
- Docker Compose

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus command-line flags: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Grafana Loki TSDB storage documentation: https://grafana.com/docs/loki/latest/operations/storage/tsdb/
- Grafana Loki upgrade notes for v3 schema and removed shipper fields: https://github.com/grafana/loki/blob/main/docs/sources/setup/upgrade/_index.md
- Grafana Loki Promtail EOL documentation: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Alloy Kubernetes log collection documentation: https://grafana.com/docs/alloy/latest/collect/logs-in-kubernetes/
- Grafana Alloy Docker run documentation: https://grafana.com/docs/alloy/latest/set-up/install/docker/
- Grafana Tempo configuration documentation: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo metrics-generator documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-generator/
- Grafana Tempo span metrics documentation: https://grafana.com/docs/tempo/latest/metrics-from-traces/span-metrics/span-metrics-metrics-generator/
- Grafana Tempo data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- OpenTelemetry JavaScript NodeSDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript SDK 2.x migration guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md

## Issues Found
- The first Prometheus Kubernetes relabeling example replaced `__address__` with only the annotated port. Updated it to combine the discovered pod address with the annotated port.
- The Loki example used `boltdb-shipper`, schema `v12`, and removed `shared_store` fields. Updated it to current TSDB storage with schema `v13`, `tsdb_shipper`, and `delete_request_store`.
- The log collection section used Promtail, which is EOL as of March 2, 2026. Replaced the Promtail example with a Grafana Alloy Kubernetes log collection pipeline and updated the Docker Compose service to use `grafana/alloy`.
- The Tempo configuration was described as production-ready while using local storage. Changed the description to a single-binary local configuration because Tempo documentation recommends object storage for production workloads.
- The OpenTelemetry JavaScript example used the removed `Resource` class constructor and deprecated semantic convention exports. Updated it to `resourceFromAttributes` and literal current semantic attribute names.
- The OpenTelemetry metrics example exported OTLP metrics to `http://prometheus:4317`, but Prometheus is not an OTLP gRPC receiver on that port in the provided stack. Replaced it with the official OpenTelemetry JavaScript `PrometheusExporter` metric reader exposing `/metrics` on port `9464`.

## Review Notes
- The Docker Compose block remains an illustrative local stack. The Kubernetes discovery examples assume the relevant Kubernetes RBAC and runtime environment are provided.
- The examples use `latest` container tags, which is convenient for a blog snippet but should be pinned in production deployments.

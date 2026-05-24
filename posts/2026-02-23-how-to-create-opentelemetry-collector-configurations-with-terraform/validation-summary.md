# Validation Summary: How to Create OpenTelemetry Collector Configurations with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- HashiCorp Helm provider (`~> 2.0`)
- HashiCorp Kubernetes provider (`~> 2.0`)
- OpenTelemetry Collector (contrib distribution)
- OpenTelemetry Helm chart (`opentelemetry-collector`)
- Prometheus (receiver and exporter)
- Loki (OTLP endpoint)
- Jaeger (OTLP receiver target)
- Prometheus Operator `ServiceMonitor` CRD (`monitoring.coreos.com/v1`)

## Sources Consulted
- OpenTelemetry Collector `debug` exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- Logging-exporter removal tracking issue: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- Loki exporter deprecation issue: https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/33916
- Grafana Loki OTLP ingestion docs: https://grafana.com/docs/loki/latest/send-data/otel/
- OpenTelemetry Helm chart release `opentelemetry-collector-0.75.0`: https://github.com/open-telemetry/opentelemetry-helm-charts/releases/tag/opentelemetry-collector-0.75.0
- OpenTelemetry Helm chart `values.yaml`: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-collector/values.yaml
- Terraform Helm provider v2/v3 upgrade guides: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/guides/v3-upgrade-guide

## Issues Found
1. **Deprecated `logging` exporter.** The `logging` exporter was deprecated in collector v0.92.0 (Jan 2024) and removed in v0.111.0 (Oct 2024); the replacement is the `debug` exporter, which uses `verbosity` (`basic|normal|detailed`) instead of `loglevel`. Replaced the exporter definition and all pipeline references (`traces`, `logs`) accordingly.
2. **Deprecated `loki` exporter.** The contrib `lokiexporter` was deprecated in July 2024 because Loki 3.x ingests OTLP natively. Replaced with `otlphttp/loki` pointed at Loki's OTLP endpoint (`http://loki.observability.svc.cluster.local:3100/otlp`) and updated the `logs` pipeline reference.
3. **Stale Helm chart version.** Chart `0.75.0` was released in November 2023 and ships collector v0.90.0 — over two years out of date for a Feb 2026 post. Bumped both `helm_release` resources to `0.108.0`, a release that aligns with the post-deprecation guidance above.

## Review Notes
- The Terraform `helm` provider v2 syntax used here (`provider "helm" { kubernetes { config_path = "..." } }`, nested block, no `=`) is correct for `~> 2.0`. Note that `hashicorp/helm` v3 (released in 2025) switches to attribute-assignment syntax (`kubernetes = { ... }`) and would break the example as written — readers who upgrade should consult the v3 upgrade guide.
- The `opentelemetry-collector` Helm chart top-level keys (`mode`, `config`, `resources`, `service`, `ports`) and the per-port fields (`enabled`, `containerPort`, `servicePort`, `protocol`) are correct.
- The `hostmetrics`, `prometheus`, `filelog`, and `otlp` receiver schemas, plus the `batch`, `memory_limiter`, `attributes`, and `resource` processor schemas, all match the current contrib component documentation.
- The `monitoring.coreos.com/v1` `ServiceMonitor` manifest matches the Prometheus Operator CRD schema and the chart's default `app.kubernetes.io/name=opentelemetry-collector` label.

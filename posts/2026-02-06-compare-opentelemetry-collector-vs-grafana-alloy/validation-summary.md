# Validation Summary: How to Compare OpenTelemetry Collector vs Grafana Alloy

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- Grafana Alloy
- Grafana Agent / Grafana Agent Flow
- Grafana Loki
- Grafana Mimir
- Grafana Tempo
- Grafana Pyroscope
- Kubernetes DaemonSet deployments
- Helm charts
- OTLP
- Prometheus scraping and remote write

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector documentation: https://opentelemetry.io/docs/collector/
- OpenTelemetry Collector distributions documentation: https://opentelemetry.io/docs/collector/distributions/
- OpenTelemetry Collector Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Collector official releases: https://github.com/open-telemetry/opentelemetry-collector-releases
- OpenTelemetry Profiles signal documentation: https://opentelemetry.io/docs/concepts/signals/profiles/
- Grafana Alloy introduction: https://grafana.com/docs/alloy/latest/introduction/
- Grafana Alloy component controller documentation: https://grafana.com/docs/alloy/latest/get-started/component_controller/
- Grafana Alloy syntax documentation: https://grafana.com/docs/alloy/latest/get-started/syntax/
- Grafana Alloy components reference: https://grafana.com/docs/alloy/latest/reference/components/
- Grafana Alloy `otelcol.receiver.otlp` reference: https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.receiver.otlp/
- Grafana Alloy `otelcol.processor.batch` reference: https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.processor.batch/
- Grafana Alloy `otelcol.exporter.otlp` reference: https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.exporter.otlp/
- Grafana Alloy Kubernetes/Helm collector reference: https://grafana.com/docs/grafana-cloud/monitor-infrastructure/kubernetes-monitoring/configuration/helm-chart-config/helm-chart/collector-reference/
- OpenTelemetry Collector Contrib Loki exporter deprecation notice: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/lokiexporter

## Issues Found
- Updated the Grafana Alloy lineage wording. The post described River as "now called Alloy configuration syntax"; the corrected text says Alloy uses declarative Alloy configuration syntax that evolved from Grafana Agent Flow's River model.
- Replaced the claim that Alloy configuration supports "conditional logic" with supported wording around expressions, built-in functions, component references, and dynamic configuration.
- Updated the Profiles row from "Limited" to "Experimental / under development" to match the current OpenTelemetry Profiles signal status.
- Corrected the Loki shipping guidance for OpenTelemetry Collector. The older Loki exporter is deprecated; the current path is usually OTLP export to Loki's native OTLP endpoint.
- Updated the Kubernetes example image from `otel/opentelemetry-collector-contrib:0.96.0` to `otel/opentelemetry-collector-contrib:0.153.0`, the latest official release found during review.

## Review Notes
- The OpenTelemetry Collector YAML example was validated with `otel/opentelemetry-collector-contrib:0.153.0`.
- The memory limiter fields were validated with `otel/opentelemetry-collector-contrib:0.153.0`.
- The Grafana Alloy configuration example was validated with `grafana/alloy:v1.16.0`.
- The Kubernetes DaemonSet snippet is structurally valid as an illustrative example, but a production manifest would normally include a mounted config key, command arguments, resource limits, RBAC, and health probes.

# Validation Summary: How to Set Up Complete Observability Stack with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Prometheus
- Grafana
- Grafana Loki
- Grafana Alloy
- OpenTelemetry Protocol
- Jaeger

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio OpenTelemetry tracing documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio OpenTelemetry access logging documentation: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/next-release/deployment/
- Grafana Loki configuration documentation: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki storage schema documentation: https://grafana.com/docs/loki/latest/operations/storage/schema/
- Grafana Promtail docker pipeline stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/docker/
- Grafana Alloy Kubernetes log source documentation: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.kubernetes/
- Grafana Alloy run command documentation: https://grafana.com/docs/alloy/latest/reference/cli/run/
- Grafana dashboard import documentation: https://grafana.com/docs/reference/export_import/
- Grafana Dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/http_api/dashboard/

## Issues Found
- The architecture and explanatory text claimed the OpenTelemetry Collector was the central hub for all telemetry, but the manifests did not deploy an OpenTelemetry Collector. Updated the text and diagram to match the actual stack: Prometheus scrapes metrics, Jaeger receives OTLP traces, and Loki stores logs.
- The Prometheus scrape configuration did not follow Istio's documented custom scrape configuration. Updated the `istiod` job to use endpoint discovery for the `http-monitoring` port and updated the Envoy job to keep ports ending in `-envoy-prom`.
- The Istio tracing provider configuration omitted `meshConfig.enableTracing: true`. Added it to the IstioOperator snippet that defines the OTLP tracing provider.
- The access log snippet also set `enableTracing: true`, which was unrelated to access logging and could confuse the two IstioOperator examples. Removed it from the access log-only snippet.
- The logging section used Promtail, which Grafana documents as deprecated, with LTS ending February 28, 2026 and EOL on March 2, 2026. Replaced the Promtail DaemonSet with a Grafana Alloy deployment using `discovery.kubernetes`, `loki.source.kubernetes`, and `loki.write`.
- The Grafana dashboard API example attempted to import a dashboard by sending only `{"id": 7639}` as the dashboard body. Updated the command to fetch the dashboard JSON from Grafana's gnet endpoint and pass that JSON to the import API.

## Review Notes
The Kubernetes YAML snippets parse successfully after the fixes. The shell snippets pass `bash -n` syntax checking. The manifests remain suitable for a tutorial or lab environment; production deployments should add persistent storage, resource limits, authentication, TLS, secret management, and current image pinning policies.

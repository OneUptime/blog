# Validation Summary: How to Configure OpenTelemetry Collector with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- OpenTelemetry Collector
- Envoy access logs
- OTLP
- Kubernetes
- Jaeger
- Grafana Tempo
- Grafana Loki
- Prometheus remote write

## Sources Consulted
- Istio OpenTelemetry distributed tracing documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio OpenTelemetry access log provider documentation: https://istio.io/latest/docs/tasks/observability/logs/otel-provider/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio MeshConfig / extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib releases: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases
- Grafana Loki OpenTelemetry ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/

## Issues Found
- The post implied Istio sends traces, metrics, and access logs from Envoy to the Collector over OTLP. Istio's documented OpenTelemetry integration covers OTLP traces and OpenTelemetry access logs; Istio metrics are Prometheus-oriented by default. Updated the description and architecture wording so metrics are described as coming from instrumented workloads or other collectors, while Istio Envoy metrics are described as Prometheus-format metrics.
- The Istio `opentelemetry` extension provider omitted `enableTracing: true` and used `resource_detectors` as a YAML list. Current Istio documentation shows tracing enabled with `meshConfig.enableTracing: true` and `resource_detectors: environment: {}`. Updated the snippet.
- The Collector image tag `otel/opentelemetry-collector-contrib:0.92.0` was outdated. Updated examples to `0.152.0`, the current released contrib image checked during validation.
- The Loki exporter example used the old Loki push API exporter style. Current Loki documentation recommends the OpenTelemetry Collector `otlphttp` exporter to Loki's OTLP endpoint. Updated the logs pipeline to use `otlphttp/loki` with `endpoint: http://loki.observability:3100/otlp`.
- The troubleshooting command used `curl` directly against the OTLP gRPC port from the `istio-proxy` container. That is unreliable because the proxy image may not include `curl`, and a normal HTTP request is not an OTLP/gRPC check. Updated it to show a TCP reachability check with `curl`'s `telnet://` scheme from an application container that has curl.

## Review Notes
Collector configuration snippets for the main pipeline, Loki logs pipeline, tail sampling processor, and attributes processor were validated with `otel/opentelemetry-collector-contrib:0.152.0 validate`. The Prometheus remote write exporter configuration is syntactically valid, but a real Prometheus backend must be configured to accept remote write traffic for that metrics pipeline to work.

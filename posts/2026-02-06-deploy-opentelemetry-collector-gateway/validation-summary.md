# Validation Summary: How to Deploy the OpenTelemetry Collector as a Gateway

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector gateway deployment pattern
- OpenTelemetry Collector receivers, processors, exporters, connectors, and extensions
- Kubernetes Deployments, Services, HorizontalPodAutoscalers, PodDisruptionBudgets, and ServiceMonitors
- Prometheus Remote Write
- Grafana Loki OTLP log ingestion
- Jaeger OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry health check extension documentation: https://pkg.go.dev/go.opentelemetry.io/collector/extension/healthcheckextension
- OpenTelemetry debug exporter documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/debugexporter
- OpenTelemetry span metrics connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry routing connector documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/routingconnector
- OpenTelemetry Prometheus Remote Write exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Loki exporter migration documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/lokiexporter
- OpenTelemetry tail sampling processor metrics documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md
- Kubernetes Topology Aware Routing documentation: https://kubernetes.io/docs/concepts/services-networking/topology-aware-routing/
- Kubernetes Service API documentation: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/

## Issues Found
- The Kubernetes probes used port 13133, but the Collector config did not enable the `health_check` extension. Added the extension, enabled it in `service.extensions`, and exposed the health port in the container spec.
- The post used the removed/deprecated `logging` exporter. Replaced it with the current `debug` exporter.
- The examples used the older environment variable expansion form `${BACKEND_API_KEY}`. Updated them to `${env:BACKEND_API_KEY}` and `${env:TENANT_A_API_KEY}`.
- The Collector image and `collector.version` example used `0.95.0`. Updated them to `0.153.0`, the current contrib image validated during review.
- The internal telemetry config used `service.telemetry.metrics.address`, which is ignored in Collector v0.123.0 and later. Replaced it with the current Prometheus pull reader configuration.
- The advanced pipeline used the old `spanmetrics` processor syntax. Replaced it with the current `span_metrics` connector and updated the traces-to-metrics pipeline wiring.
- The span metrics config explicitly listed `service.name`, which is already a default dimension in the current connector and fails validation. Removed the duplicate dimension.
- The Prometheus Remote Write exporter incorrectly used generic `sending_queue`. Replaced it with `remote_write_queue`.
- The Loki example used the deprecated Loki exporter and deprecated label/format settings. Replaced it with `otlphttp/loki` targeting Loki's native OTLP log endpoint.
- The routing example used `https://` URLs with the OTLP gRPC exporter. Replaced those with host:port endpoints and kept TLS settings separately.
- The routing example specified `cert_file` without `key_file`, which fails OTLP exporter TLS validation. Added matching key file paths.
- The Kubernetes Service used the deprecated `service.kubernetes.io/topology-aware-hints` annotation. Updated it to `service.kubernetes.io/topology-mode: Auto`.
- The tail sampling metric `otelcol_processor_tail_sampling_sampling_decision_latency` was stale. Updated it to `otelcol_processor_tail_sampling_sampling_decision_timer_latency`.

## Review Notes
- Validated the basic, advanced, and routing Collector snippets with `otel/opentelemetry-collector-contrib:0.153.0 validate`.
- The post's statement that all spans for a tail-sampled trace must reach the same Collector remains important; Kubernetes `sessionAffinity: ClientIP` may help only when client IP stickiness maps appropriately to traces. For larger deployments, the official gateway pattern documentation recommends a two-tier setup with the load-balancing exporter using trace ID routing.

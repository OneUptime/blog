# Validation Summary: How to Build a Four-Signal Correlation Pipeline in a Single Collector

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- OTLP receiver and exporters
- Span Metrics connector
- Service Graph connector
- Transform, filter, memory limiter, resource, and batch processors
- Prometheus Remote Write
- Grafana Tempo
- Grafana Loki
- Grafana Pyroscope
- OpenTelemetry SDK declarative configuration
- Kubernetes Deployments
- PromQL

## Sources Consulted
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector OTLP gRPC exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector Contrib span metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector Contrib service graph connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/servicegraphconnector/README.md
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry SDK declarative configuration schema documentation: https://github.com/open-telemetry/opentelemetry-configuration/blob/main/schema-docs.md
- OpenTelemetry SDK declarative configuration examples: https://github.com/open-telemetry/opentelemetry-configuration/tree/main/examples
- Grafana Loki OTLP ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/
- Grafana Pyroscope OpenTelemetry profiling documentation: https://grafana.com/docs/pyroscope/latest/configure-client/opentelemetry/ebpf-profiler/
- Runtime validation with `otel/opentelemetry-collector-contrib:latest` and `otelcol-contrib validate --feature-gates=service.profilesSupport`.

## Issues Found
- The Collector profile pipeline omitted the required `service.profilesSupport` feature gate. Added the caveat to the post and added the feature gate to the Kubernetes container args.
- The Collector example used deprecated connector component names `spanmetrics` and `servicegraph`. Updated them to `span_metrics` and `service_graph`.
- The OTLP gRPC exporters for Tempo and Pyroscope used `http://` URLs. Updated their endpoints to gRPC `host:port` form.
- The Loki exporter used the OTLP gRPC exporter against Loki's OTLP HTTP endpoint. Changed it to `otlp_http/logs`, which is the correct Collector exporter for Loki OTLP log ingestion.
- The profile pipeline used `batch/profiles`, but the current contrib Collector image does not support the batch processor for profiles. Removed the profile batch processor and validated the resulting Collector configuration.
- The Collector self-telemetry example used `service.telemetry.metrics.address`, which is no longer the current config shape. Replaced it with a Prometheus pull reader on `0.0.0.0:8888`.
- The SDK configuration used outdated declarative config syntax (`file_format: "0.3"`, map-style resource attributes, `otlp` plus `protocol: grpc`, and scalar propagator entries). Updated it to `file_format: "1.0"`, list-style attributes, `otlp_grpc`, and object-style propagator entries.
- The SDK section claimed the application SDK sends all four signals, but the snippet only configures traces, metrics, and logs. Clarified that profiles generally come from a profiling agent or runtime-specific profiler exporting OTLP profiles.
- The PromQL examples used raw OTLP internal metric names for counters exposed through Prometheus. Added the Prometheus `_total` suffixes to the counter queries.

## Review Notes
The corrected Collector configuration was validated successfully with the current `otel/opentelemetry-collector-contrib:latest` image and `service.profilesSupport` enabled. The Prometheus Remote Write component is still named `prometheusremotewrite` in that released image, so the post keeps that working component name even though upstream documentation has begun documenting a snake_case alias.

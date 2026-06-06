# Validation Summary: Build a Centralized Telemetry Gateway for Multi-Cluster Platform Environments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- OTLP over gRPC and HTTP
- Kubernetes Deployments and Services
- Tail-based sampling
- Collector exporter retry and sending queues
- Collector TLS and mTLS configuration

## Sources Consulted
- OpenTelemetry Collector gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry agent-to-gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/other/agent-to-gateway/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector processor list: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector load-balancing exporter documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/loadbalancingexporter
- OpenTelemetry Collector official releases: https://github.com/open-telemetry/opentelemetry-collector-releases

## Issues Found
- The original HA central gateway guidance used ordinary load balancing while applying tail-based sampling. Tail sampling requires all spans for a trace to reach the same collector instance, so the per-cluster trace exporter was changed to the current `load_balancing` exporter with `routing_key: traceID`.
- The original local exporter used only server CA verification while the operational guidance recommended mTLS. The local exporter now includes client certificate and key fields, and the central OTLP receiver now includes server certificate, key, and client CA fields.
- The original transform processor example used `set(description, "")`, which is not the correct OTTL path for metric descriptions. It was changed to `set(metric.description, "") where metric.description == "UNSET"`.
- The original text said the transform normalized metric names, but the example normalized descriptions. The comment was corrected to match the actual transform.
- The collector image tag was outdated. It was updated from `otel/opentelemetry-collector-contrib:0.96.0` to the current official release image `ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.153.0`.
- The operational metrics list included `otelcol_processor_dropped_spans`, which is not a recommended current metric in the official internal telemetry docs. It was replaced with queue capacity and enqueue-failure metrics.
- The internal telemetry note now clarifies that the default Prometheus endpoint is on port 8888 but is bound to localhost unless configured otherwise.

## Review Notes
The collector configuration snippets were validated with `otelcol-contrib validate` using the v0.153.0 image. The Kubernetes manifest was reviewed for API shape, but `kubectl` was not available locally for client-side validation.

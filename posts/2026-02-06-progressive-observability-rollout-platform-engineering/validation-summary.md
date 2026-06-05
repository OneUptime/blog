# Validation Summary: How to Use Progressive Observability Rollout for Platform Engineering Teams

## Status
validated

## Post Type
Technical implementation guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- OpenTelemetry Python zero-code instrumentation
- OTLP gRPC and OTLP/HTTP
- OpenTelemetry Collector memory_limiter, batch, and tail_sampling processors
- Kubernetes Deployments
- Observability rollout strategy

## Sources Consulted
- OpenTelemetry Python zero-code instrumentation documentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python agent configuration documentation: https://opentelemetry.io/docs/zero-code/python/configuration/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector/releases
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- OpenTelemetry performance benchmark specification: https://opentelemetry.io/docs/specs/otel/performance-benchmark/

## Issues Found
- The Phase 1 Python auto-instrumentation command exported metrics even though the Phase 1 Collector config only defined a traces pipeline. Updated `--metrics_exporter otlp` to `--metrics_exporter none`, matching the OpenTelemetry Python guidance to specify `none` when metrics are not being exported.
- The Phase 2 text said to start collecting metrics, but the Collector config only included a traces pipeline. Added a metrics pipeline using the OTLP receiver, `memory_limiter`, `batch`, and `otlphttp` exporter.
- The Phase 3 guidance scaled tail sampling behind a generic load balancer without mentioning that tail sampling requires all spans for a trace to reach the same Collector instance. Added a trace-affinity caveat before the Kubernetes Deployment example.
- The Kubernetes Deployment snippet had a selector but no matching `spec.template.metadata.labels`, which would be rejected by the Kubernetes API. Added matching pod template labels.
- The Collector image tag was pinned to `0.96.0`, which is outdated for this 2026 post. Updated it to `0.153.0`, the current latest Collector release found during review.
- The resistance section claimed OpenTelemetry auto-instrumentation typically adds less than 3% overhead. Replaced the unsupported fixed percentage with wording that overhead depends on workload, language, libraries, exporters, and sampling settings, and kept the recommendation to use pilot measurements.

## Review Notes
The remaining snippets are illustrative and use placeholder backend endpoints. Production use still requires environment-specific TLS, authentication headers, collector config mounting, capacity testing, and backend-specific endpoint paths.

# Validation Summary: How to Fix the Go OpenTelemetry Exporter Failing Silently Because GOMEMLIMIT Is

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Go runtime memory management (`GOMEMLIMIT`, `GOGC`)
- OpenTelemetry Collector
- OpenTelemetry Collector `memory_limiter` processor
- OpenTelemetry Go OTLP trace gRPC exporter
- Kubernetes Deployments and resource limits
- Docker Compose resource limits
- OTLP/gRPC retry and backpressure behavior

## Sources Consulted
- Go runtime package documentation: https://go.dev/pkg/runtime/
- OpenTelemetry Collector `memory_limiter` processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/memorylimiterprocessor
- OpenTelemetry Go `otlptracegrpc` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go `otel` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel
- OpenTelemetry Protocol specification: https://opentelemetry.io/docs/specs/otlp/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/

## Issues Found
1. **Incomplete Kubernetes Deployment manifest**: The original example omitted the required Deployment selector and matching pod template labels. Added `spec.selector.matchLabels` and `spec.template.metadata.labels` so the manifest is structurally valid.
2. **Memory limiter threshold math was inaccurate**: The post said `limit_percentage: 75` starts refusing data at 384MB. The Collector memory limiter treats `limit_percentage` as the hard limit and starts refusing at the soft limit, which is the hard limit minus the spike allowance. Updated the explanation and changed `spike_limit_percentage` from 25 to 15 so the soft limit stays below the 410MiB `GOMEMLIMIT` example.
3. **Go OTLP gRPC exporter example missed plaintext configuration**: `otlptracegrpc` requires TLS by default unless `WithInsecure()` is used or the endpoint configuration specifies insecure transport. Added `otlptracegrpc.WithInsecure()` for the plain `otel-collector:4317` example.
4. **Over-specific backpressure wording**: The post said the exporter will get a gRPC status code indicating temporary unavailability. OTLP specifies retryable errors such as `Unavailable`, and memory limiter refusal propagates as retryable errors through correctly implemented receivers. Adjusted the wording to avoid guaranteeing a single exact status in all deployments.
5. **Ambiguous memory units and data-loss wording**: Replaced `512MB` with `512Mi` where it refers to the Kubernetes example and clarified that data loss can happen after buffers fill or retry budgets are exhausted, rather than implying the Go runtime directly causes silent Collector drops.

## Review Notes
The post's central recommendation is consistent with current Collector guidance: configure `GOMEMLIMIT` and place `memory_limiter` first in Collector pipelines. The Go exporter retry example is valid, but the default `otlptracegrpc` retry policy is already enabled; explicitly setting it is still acceptable when the application wants custom retry timings.

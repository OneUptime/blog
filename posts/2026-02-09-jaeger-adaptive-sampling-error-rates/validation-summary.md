# Validation Summary: How to Configure Jaeger Adaptive Sampling Based

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Jaeger
- Jaeger remote sampling
- Jaeger adaptive sampling
- OpenTelemetry Go SDK
- OTLP trace export
- Prometheus / Grafana-style dashboards

## Sources Consulted
- Jaeger Sampling documentation: https://www.jaegertracing.io/docs/1.76/architecture/sampling/
- Jaeger Remote Sampling API documentation: https://www.jaegertracing.io/docs/1.76/architecture/apis/
- Jaeger CLI flags documentation for collector sampling and OTLP options: https://www.jaegertracing.io/docs/1.52/cli/
- OpenTelemetry Go exporter documentation: https://opentelemetry.io/docs/languages/go/exporters/
- OpenTelemetry Go Jaeger remote sampler package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/samplers/jaegerremote
- Deprecated OpenTelemetry Go Jaeger exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/jaeger
- OpenTelemetry Go SDK trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace

## Issues Found
- The post claimed Jaeger's built-in adaptive sampling adjusts sampling based on service error rates. Jaeger adaptive sampling is traffic-volume based and recalculates probabilities per service/operation to match `--sampling.target-samples-per-second`. Updated the explanation to distinguish Jaeger adaptive sampling from a custom application-side error-aware sampler.
- The Kubernetes example configured a static sampling strategies file while describing adaptive sampling. Replaced it with adaptive sampling configuration using `SAMPLING_CONFIG_TYPE=adaptive`, `--sampling.target-samples-per-second`, and `--sampling.initial-sampling-probability`.
- The static sampling JSON used an invalid top-level `per_operation_strategies` structure for Jaeger remote sampling. Removed the static file example because it did not match the adaptive sampling section.
- The Go remote sampling example hand-implemented Jaeger remote sampling with incorrect types and incomplete logic. Replaced it with the official `go.opentelemetry.io/contrib/samplers/jaegerremote` sampler.
- The Go examples used the deprecated OpenTelemetry Jaeger exporter. Replaced it with the OTLP HTTP exporter, which OpenTelemetry and Jaeger recommend for current Jaeger versions.
- The Kubernetes service did not expose the OTLP HTTP port used by the updated Go exporter. Added port `4318` to the collector container and service.
- The custom sampler code omitted the `log` import. Added it.
- The custom sampler description implied errors could be known before head-based sampling decisions. Added a caveat that the custom sampler reacts to errors observed in sampled spans from a previous window.
- The monitoring dashboard used non-standard Jaeger Prometheus metric names. Updated the queries to use explicitly application-exported sampler metrics.
- The test snippet had mismatched package/imports and reused empty sampling parameters. Updated it to compile in the sampler package and generate trace IDs for ratio-based sampling decisions.

## Review Notes
The corrected post is technically valid as a conceptual tutorial, but the custom error-aware sampler is illustrative. A production implementation should export the custom metrics shown in the dashboard, close background sampler goroutines during shutdown, and account for multi-span traces and distributed instances when calculating error rates.

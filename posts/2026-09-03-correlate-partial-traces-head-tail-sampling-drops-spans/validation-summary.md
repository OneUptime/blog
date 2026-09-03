# Validation Summary: How to Correlate Partial Traces After Head or Tail Sampling Drops Spans

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing and sampling
- OpenTelemetry SDK head sampling
- OpenTelemetry Collector tail-sampling processor
- OpenTelemetry Collector load-balancing exporter
- OpenTelemetry Protocol (OTLP)
- W3C Trace Context propagation
- Trace, log, metric, and exemplar correlation

## Sources Consulted
- [OpenTelemetry Sampling Concepts](https://opentelemetry.io/docs/concepts/sampling/)
- [OpenTelemetry Tracing SDK: Sampling](https://opentelemetry.io/docs/specs/otel/trace/sdk/#sampling)
- [OpenTelemetry Tracing API](https://opentelemetry.io/docs/specs/otel/trace/api/)
- [OpenTelemetry General SDK Configuration](https://opentelemetry.io/docs/languages/sdk-configuration/general/)
- [OpenTelemetry Collector Contrib Tail Sampling Processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor)
- [Tail Sampling Processor Internal Telemetry](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md)
- [OpenTelemetry Collector Contrib Load-Balancing Exporter](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/loadbalancingexporter)
- [OpenTelemetry Protocol Specification: Partial Success](https://opentelemetry.io/docs/specs/otlp/#partial-success)
- [OpenTelemetry Logs Data Model](https://opentelemetry.io/docs/specs/otel/logs/data-model/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)

## Issues Found
No technical issues found.

## Review Notes
- The `parentbased_traceidratio` environment configuration remains a standardized and supported configuration value, although the OpenTelemetry tracing specification now marks the underlying `TraceIdRatioBased` sampler as deprecated in favor of the newer composable `ProbabilitySampler`. The specification requires implementations to retain the original sampler behavior until at least January 1, 2027, and language support for newer sampling configuration varies.
- Tail-sampling processor metrics and some configuration capabilities have development-level stability and can change between Collector releases, so the post's advice to validate against the deployed release is appropriate.

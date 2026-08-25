# Validation Summary: Place Span Metrics Before Tail Sampling to Avoid Biased RED Metrics

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- OpenTelemetry
- OpenTelemetry Collector and Collector Contrib
- Span Metrics Connector
- Tail Sampling Processor
- OTLP receivers and exporters
- RED metrics
- W3C Trace Context probability-sampling information
- OpenTelemetry metrics Single Writer Principle

## Sources Consulted

- [OpenTelemetry Collector Contrib v0.159.0 official release](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.159.0)
- [Span Metrics Connector documentation for v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/connector/spanmetricsconnector/README.md), [configuration implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/connector/spanmetricsconnector/config.go), and [official test configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/connector/spanmetricsconnector/testdata/config.yaml)
- [Span Metrics Connector adjusted-count implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/connector/spanmetricsconnector/internal/metrics/adjusted_count.go) and [metric aggregation implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/connector/spanmetricsconnector/connector.go)
- [Tail Sampling Processor documentation for v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md) and [configuration implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.go)
- [OpenTelemetry Collector connector documentation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/connector/README.md)
- [OpenTelemetry Collector architecture documentation](https://opentelemetry.io/docs/collector/architecture/)
- [OpenTelemetry Collector Memory Limiter Processor documentation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md)
- [OpenTelemetry TraceState probability-sampling specification](https://opentelemetry.io/docs/specs/otel/trace/tracestate-probability-sampling/) and [TraceState encoding rules](https://opentelemetry.io/docs/specs/otel/trace/tracestate-handling/)
- [OpenTelemetry metrics data model and Single Writer Principle](https://opentelemetry.io/docs/specs/otel/metrics/data-model/#single-writer)
- [OpenTelemetry load-balancing exporter documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/exporter/loadbalancingexporter/README.md)

## Issues Found

- The complete-population paragraph said the topology counts every span reaching the OTLP receiver, but the configured `memory_limiter` can refuse a received batch before the connector sees it. It also categorically said upstream SDK and probabilistic sampling could not be accounted for, despite the connector's current adjusted-count support. The paragraph now describes spans accepted by the full-span branch, distinguishes compatible probability sampling from invisible upstream drops, and limits the before-every-sampler recommendation to cases without valid adjusted counts.
- The tail-sampling feature gate was called only `usetracestate`. The text now uses its actionable full identifier, `processor.tailsamplingprocessor.usetracestate`, and states that it is alpha and off by default.
- The controlled-workload instructions said the sampler retained all failures and 5% of successes, omitting that the configured latency policy retains every slow trace, including slow successes. The instructions now describe the actual union of the error, slow, and baseline policies.
- The validation workload treated the selected operation as one metric series and did not state how failures are recognized. Because `status.code` and `collector.instance.id` are default dimensions, success and error data are separate streams, and the status-code policy matches OpenTelemetry Span Status rather than arbitrary HTTP error attributes. The text now requires `ERROR` span status and tells readers to aggregate or filter the default dimensions as appropriate.

## Review Notes

- The unchanged YAML configuration passed `otelcol-contrib v0.159.0 validate` using the official release binary. Its component IDs, pipeline types, tail-sampling policies, `histogram.unit: s`, delta temporality, and flush interval are valid.
- The three top-level tail-sampling policies combine as positive votes: error status, whole-trace latency of at least 1500 ms, or the 5% probabilistic baseline. The probabilistic policy therefore retains approximately 5% of traces not already retained by the other positive policies.
- `span_metrics` is the current component type and `spanmetrics` is a deprecated compatibility alias. The connector remains alpha, and the deprecated alias may be removed in a future release.
- `processor.tailsamplingprocessor.usetracestate` is alpha and disabled by default in v0.159.0. The shown YAML does not enable it; it is discussed only as a version-sensitive alternative for post-sampling metrics.
- The connector currently documents milliseconds as its default duration unit behind a pending feature-gate transition. Explicitly setting `histogram.unit: s` makes the example independent of that default.
- The OTLP exporter endpoints are syntactically valid placeholders. OTLP gRPC exporters use TLS by default, so real replacements must present certificates trusted by the Collector unless TLS is explicitly reconfigured.
- Receiver fan-out, per-pipeline processor instances, two-tier tail-sampling guidance, trace-ID load balancing, default metric dimensions, cardinality controls, and Single Writer guidance all match current official documentation.
- All external links in the post returned HTTP 200 during validation. The post links to mutable `main` documentation, so version-sensitive details should be rechecked during future Collector upgrades.

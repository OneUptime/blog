# Validation Summary: Preserve Unbiased Request Metrics with Selective Tail Sampling

## Status

validated

## Post Type

Technical guide and OpenTelemetry Collector configuration reference

## Technologies Covered

- OpenTelemetry
- OpenTelemetry Collector Contrib v0.159.0
- Tail Sampling processor
- Span Metrics connector
- W3C Trace Context and OpenTelemetry `tracestate` probability fields
- Consistent probability sampling and adjusted counts
- RED metrics for HTTP and RPC services
- YAML Collector configuration

## Sources Consulted

- [OpenTelemetry Collector Contrib v0.159.0 release](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.159.0)
- [Tail Sampling processor documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md)
- [Tail Sampling feature gates and internal telemetry](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/documentation.md)
- [Tail Sampling decision-time threshold rewrite](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/tailsamplingprocessor/processor.go#L788-L855)
- [Tail Sampling sampled-cache late-span forwarding](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/tailsamplingprocessor/processor.go#L596-L613)
- [Tail Sampling in-memory post-decision forwarding](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/tailsamplingprocessor/processor.go#L1050-L1054)
- [Tail Sampling threshold-writing implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/tailsamplingprocessor/internal/sampling/util.go#L112-L141)
- [Tail Sampling probabilistic-policy implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/tailsamplingprocessor/internal/sampling/probabilistic.go#L77-L110)
- [Span Metrics connector documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/connector/spanmetricsconnector/README.md)
- [Span Metrics configuration fields](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/connector/spanmetricsconnector/config.go)
- [Span Metrics adjusted-count implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/connector/spanmetricsconnector/internal/metrics/adjusted_count.go)
- [Span Metrics calls and histogram aggregation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/connector/spanmetricsconnector/connector.go#L458-L507)
- [OpenTelemetry Collector configuration](https://opentelemetry.io/docs/collector/configuration/)
- [OpenTelemetry Collector feature gates](https://github.com/open-telemetry/opentelemetry-collector/blob/main/featuregate/README.md)
- [OpenTelemetry TraceState probability-sampling specification](https://opentelemetry.io/docs/specs/otel/trace/tracestate-probability-sampling/)
- [OpenTelemetry TraceState handling specification](https://opentelemetry.io/docs/specs/otel/trace/tracestate-handling/)
- [OpenTelemetry HTTP metrics semantic conventions](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/)
- [OpenTelemetry RPC metrics semantic conventions](https://opentelemetry.io/docs/specs/semconv/rpc/rpc-metrics/)

## Issues Found

- The post said the tail processor rewrites the effective threshold for sampled traces without limiting that claim to spans present when the decision is made. In Collector Contrib v0.159.0, a span arriving after a keep decision can be forwarded directly through either the sampled decision-cache path or the in-memory post-decision path, without the tail stage rewriting its `th`. The explanation now scopes the rewrite to spans present at the decision, the invalid-adjustment list now covers late request-counting server spans, and the unparseable-TraceState counter description now makes clear that late spans bypassing the rewrite are outside its scope. This matters because the post-tail connector may otherwise count such a span as 1 or adjust it using only an earlier threshold, biasing the request-count estimate.

## Review Notes

- The combined YAML configuration was validated successfully with the official `otelcol-contrib` v0.159.0 binary and `--feature-gates=+processor.tailsamplingprocessor.usetracestate`.
- `span_metrics`, `otlp_grpc`, `namespace`, `enable_metrics_sampling_method`, the three tail policies, and their field values are current valid configuration identifiers.
- The inverse-probability explanation, minimum-threshold behavior for OR-combined policies, `th=0` behavior for matching status and latency policies, and preservation of stricter upstream thresholds were verified against the specification and implementation.
- The Span Metrics connector applies stochastic adjusted counts independently of `enable_metrics_sampling_method`; the option only adds the `sampling.method` dimension. Calls and duration histogram observations use the adjusted weight.
- The tail-sampling TraceState feature gate and the Span Metrics traces-to-metrics connector are alpha in v0.159.0. The TraceState probability-sampling specifications are marked Development, so later Collector releases should be revalidated before adopting this path for SLO data.
- All external links in the post resolved to the intended official documentation or source files during review.

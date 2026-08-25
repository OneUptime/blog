# Validation Summary: Why Tail Sampling Cannot Recover Traces Dropped by the SDK

## Status

validated

## Post Type

Technical configuration and operations guide

## Technologies Covered

- OpenTelemetry tracing SDK samplers
- OpenTelemetry SDK environment configuration
- ParentBased, AlwaysOn, AlwaysOff, and TraceIdRatioBased sampling
- W3C Trace Context propagation and sampled flags
- OpenTelemetry Collector Contrib tail-sampling processor
- OpenTelemetry Collector load balancing, memory limiting, exporter queues, and diagnostic exporting
- YAML and shell environment configuration

## Sources Consulted

- [OpenTelemetry Tracing SDK sampler specification](https://opentelemetry.io/docs/specs/otel/trace/sdk/#sampler)
- [OpenTelemetry general SDK sampler environment configuration](https://opentelemetry.io/docs/languages/sdk-configuration/general/#otel_traces_sampler)
- [OpenTelemetry trace API](https://opentelemetry.io/docs/specs/otel/trace/api/)
- [OpenTelemetry semantic conventions for recording errors](https://opentelemetry.io/docs/specs/semconv/general/recording-errors/)
- [OpenTelemetry semantic conventions for HTTP span status](https://opentelemetry.io/docs/specs/semconv/http/http-spans/#status)
- [W3C Trace Context Level 2](https://www.w3.org/TR/trace-context-2/)
- [OpenTelemetry Collector Contrib v0.159.0 tail-sampling processor documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md)
- [OpenTelemetry Collector Contrib v0.159.0 tail-sampling configuration source](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.go)
- [OpenTelemetry Collector debug exporter](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md)
- [OpenTelemetry Collector configuration and pipeline model](https://opentelemetry.io/docs/collector/configuration/)
- [OpenTelemetry Collector Contrib load-balancing exporter](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md)
- [OpenTelemetry Collector memory-limiter processor](https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md)
- [OpenTelemetry Collector exporter queue and retry behavior](https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md)

## Issues Found

- The post said a tail sampler could not "infer" a dropped span. A later exported descendant can expose a missing parent ID, although it cannot restore the dropped span or evaluate its attributes, events, status, or outcome. Changed the claim to say the tail sampler cannot reconstruct or evaluate the missing span.
- The `remoteParentNotSampled` guidance said that branch should merely "record." A `RECORD_ONLY` span normally does not reach an exporter, so it is insufficient for Collector tail sampling. Changed the guidance to require `RECORD_AND_SAMPLE`, with delegation to `AlwaysOn` as the example.
- The capacity and conclusion wording referred to an "all-recording" path. Because recording without the sampled flag does not guarantee export, changed those references to an all-sampled (`RECORD_AND_SAMPLE`) path and clarified that both recording and exporting carry cost.
- The verification instructions referred to a nonexistent Collector "debug receiver." Changed this to the standard `debug` exporter and specified a parallel diagnostic pipeline that bypasses tail sampling so it observes the pre-tail stream.
- The verification instructions did not guarantee that the `status_code` policy would match the generated error. Changed the test setup to require span status `ERROR`; an exception event or error attribute alone is not what this policy evaluates.

## Review Notes

- The shell environment values and tail-sampling YAML are syntactically valid. The `status_code` policy, `trace_flags` policy, `num_traces`, decision caches, and `maximum_trace_size_bytes` are present in the current v0.159.0 Collector Contrib release.
- `TraceIdRatioBased` is deprecated by the current SDK specification in favor of `ProbabilitySampler`, but `parentbased_traceidratio` remains an officially recognized environment value and its behavior is required to remain available unchanged until at least January 1, 2027. The post uses it as a configuration to avoid when complete error capture is required, not as its recommendation.
- Tail storage support is experimental and disabled by default behind the `processor.tailsamplingprocessor.tailstorageextension` feature gate. The post only identifies it as a capacity consideration and does not present it as stable configuration.
- Retaining every error within the upstream-admitted population still assumes complete, timely delivery and sufficient tail-sampler capacity. The post's pre-tail audit and capacity sections address those operational prerequisites.
- The tail-sampling processor is currently beta and version-sensitive, so deployments should validate configuration against their exact Collector distribution and release.

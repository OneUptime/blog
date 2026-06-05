# Validation Summary: How to Implement Latency-Based Sampling to Capture Slow Traces

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector tail sampling processor
- OpenTelemetry Collector load-balancing exporter
- OpenTelemetry Python tracing API
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector Contrib tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector Contrib tail sampling processor telemetry documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md
- OpenTelemetry Collector Contrib load-balancing exporter documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/loadbalancingexporter
- OpenTelemetry Collector gateway deployment pattern documentation: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/

## Issues Found
- The tiered latency example described ranges, but the `latency` policies only set lower bounds. Added `upper_threshold_ms` to the 1s-to-5s and 500ms-to-1s tiers so the configuration matches the comments and explanation.
- The Tier 3 explanation said the trace must exceed 500ms, which did not fully describe the bounded range. Updated it to say the trace must fall between 500ms and 1s.
- The custom latency section referred to a generic `attribute` policy, but the tail sampling processor uses specific policy types such as `boolean_attribute`, `string_attribute`, and `numeric_attribute`. Updated the text to reference `boolean_attribute` for the `request.is_slow` boolean attribute.
- Two tail sampling metric names were outdated or inaccurate. Replaced them with current documented metrics: `otelcol_processor_tail_sampling_sampling_decision_timer_latency` and `otelcol_processor_tail_sampling_sampling_trace_dropped_too_early`.

## Review Notes
The load-balancing exporter examples are conceptually correct for trace-ID-aware routing to a second Collector tier. Current documentation notes that `traceID` is the default routing key for traces when no `routing_key` is set, so the example is valid without explicitly setting it.

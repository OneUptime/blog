# Validation Summary: How to Implement Tail-Based Sampling in OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib tail sampling processor
- OpenTelemetry Collector load-balancing exporter
- OpenTelemetry Collector Kafka exporter and receiver
- Collector internal telemetry metrics
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry sampling concepts: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Contrib tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector Contrib tail sampling processor generated telemetry documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md
- OpenTelemetry Collector Contrib load-balancing exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- OpenTelemetry Collector Contrib Kafka exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/kafkaexporter/README.md
- OpenTelemetry Collector Contrib Kafka receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kafkareceiver/README.md

## Issues Found
- The post described tail sampling as always deciding after the entire trace is available. Updated the wording and diagram to reflect the Collector behavior: it makes a decision after the configured decision window using the spans it has received, so late spans can affect policy accuracy.
- The rate limiting policy description said it caps traces per second. The official policy uses `spans_per_second`, so the text now says it caps sampled throughput by spans per second.
- The composite policy section described composite policies as AND logic. The official processor has a separate `and` policy; `composite` combines policies with ordering and rate allocation. Updated the description.
- The load-balancing exporter example used the deprecated `loadbalancing` component name. Updated the example and text to the current `load_balancing` name.
- The Kafka example used outdated or invalid top-level `topic`, top-level `encoding`, and `producer.partition_strategy: trace_id` fields. Updated it to current signal-specific `traces.topic`, `traces.encoding`, `partition_traces_by_id: true`, and receiver `traces.topics`.
- The monitoring section listed non-existent or outdated tail sampling metrics, including `otelcol_processor_tail_sampling_count_traces_dropped` and `otelcol_processor_tail_sampling_sampling_decision_latency`. Replaced them with current documented metrics, including `otelcol_processor_tail_sampling_sampling_decision_timer_latency` and `otelcol_processor_tail_sampling_sampling_late_span_age`.
- The explanation for `sampling_trace_dropped_too_early` said it indicated `decision_wait` was too short and described late spans. Updated it to match the official documentation: it counts traces dropped before the configured wait time, usually because the processor exceeds `num_traces`.
- The checkout route example used `"/checkout/*"` as a plain string match. Updated it to a regex pattern with `enabled_regex_matching: true` so it actually matches checkout subpaths.

## Review Notes
All YAML snippets parse successfully after the corrections. The post remains version-neutral, but the reviewed Collector component names and Kafka fields match the current official OpenTelemetry Collector Contrib documentation as of 2026-06-15.

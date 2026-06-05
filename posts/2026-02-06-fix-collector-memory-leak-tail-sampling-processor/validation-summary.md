# Validation Summary: How to Fix the Collector Memory Leak Caused by the Tail Sampling Processor

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector tail sampling processor
- OpenTelemetry Collector load-balancing exporter
- Kubernetes kubectl
- Prometheus metrics
- YAML configuration

## Sources Consulted
- OpenTelemetry tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry tail sampling processor generated metrics documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md
- OpenTelemetry Collector gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry load-balancing exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post said `expected_new_traces_per_sec` and `decision_wait` determine the number of traces buffered. Updated this to explain that `expected_new_traces_per_sec` helps allocate internal data structures, while `num_traces` caps the number of traces kept in memory.
- The post listed `otelcol_processor_tail_sampling_count_traces_sampled` as a metric for traces in the tail sampling buffer. Replaced it with `otelcol_processor_tail_sampling_sampling_traces_on_memory` and added `otelcol_processor_tail_sampling_sampling_trace_dropped_too_early`.
- The post said that when `num_traces` is reached, the oldest traces are force-sampled. Updated this to match the official behavior: old traces can be removed before `decision_wait` and dropped before a sampling decision.
- The post described ordinary tail sampling policies as composite policies that reduce buffer size. Updated the heading and explanation to say these policies reduce exported volume, while tail sampling still buffers traces before deciding.
- The two-tier architecture snippet said the first tier does head sampling, but the shown pipeline only routes traces. Updated the comment to describe trace-aware routing.
- The load-balancing exporter snippet used the deprecated `loadbalancing` exporter name. Updated it to `load_balancing`.

## Review Notes
The article uses "memory leak" in a broad operational sense. The tail sampling processor's high memory use is expected retention bounded by configuration, not necessarily a software leak. The post now describes the configuration behavior more precisely while preserving the original focus.

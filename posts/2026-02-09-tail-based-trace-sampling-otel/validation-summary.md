# Validation Summary: How to Use Tail-Based Trace Sampling Using OpenTelemetry Collector Load

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Tail sampling processor
- Load-balancing exporter
- Group-by-trace processor
- Kubernetes DaemonSet, StatefulSet, and Service resources
- Prometheus / PromQL alerting

## Sources Consulted
- OpenTelemetry Collector gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector processors list: https://opentelemetry.io/docs/collector/components/processor/
- Tail sampling processor documentation and configuration: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- Tail sampling processor generated telemetry documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md
- Load balancing exporter documentation and configuration: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/loadbalancingexporter
- Group by trace processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/groupbytraceprocessor
- Debug exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/debugexporter
- OpenTelemetry Collector exporter helper documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md

## Issues Found
- Replaced deprecated `loadbalancing` exporter keys with the canonical `load_balancing` exporter name and updated pipeline references.
- Replaced the deprecated `logging` exporter example and `loglevel` option with the current `debug` exporter and `verbosity` option.
- Quoted load-balancing DNS resolver `port` values so the config validates with `otelcol-contrib` v0.153.0.
- Removed an invalid resolver example that configured both `dns` and `static` under the same load-balancing exporter. The exporter accepts only one resolver.
- Corrected the advanced composite policy example. Tail sampling has no `or` policy type, so the example now models `(error OR slow) AND production` with two valid `and` sub-policies inside a composite policy.
- Corrected misleading comments and claims: tail sampling decisions happen after a configured decision window, `rate_limiting` is across sampled spans rather than per service, and policy ordering only applies when using explicit controls such as `sample_on_first_match` or composite `policy_order`.
- Updated PromQL metric names to current tail sampling processor telemetry, including `otelcol_processor_tail_sampling_sampling_traces_on_memory` and `otelcol_processor_tail_sampling_global_count_traces_sampled`.

## Review Notes
- Verified the main agent and gateway Collector configurations, the load-balancing snippet, and the composite tail-sampling policy with `otelcol-contrib validate` using OpenTelemetry Collector Contrib v0.153.0.
- All YAML snippets parse successfully. The guide still uses `otel/opentelemetry-collector-contrib:latest`; pinning a version would be preferable for production examples.

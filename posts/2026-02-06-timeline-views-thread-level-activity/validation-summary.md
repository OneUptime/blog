# Validation Summary: How to Use Timeline Views Beyond Flame Graphs for Thread-Level Activity Analysis

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Profiles
- OpenTelemetry Collector eBPF Profiling Distribution
- eBPF profiling
- pprof-compatible profile data
- Grafana State timeline visualization
- Python
- Docker

## Sources Consulted
- OpenTelemetry Collector distributions documentation: https://opentelemetry.io/docs/collector/distributions/
- OpenTelemetry Collector eBPF Profiling Distribution README: https://github.com/open-telemetry/opentelemetry-collector-releases/tree/main/distributions/otelcol-ebpf-profiler
- OpenTelemetry eBPF profiler repository README and local example configuration: https://github.com/open-telemetry/opentelemetry-ebpf-profiler
- OpenTelemetry eBPF profiler receiver configuration source: https://github.com/open-telemetry/opentelemetry-ebpf-profiler/blob/main/collector/config/config.go
- OpenTelemetry eBPF profiler OTLP profile generation source: https://github.com/open-telemetry/opentelemetry-ebpf-profiler/blob/main/reporter/internal/pdata/generate.go
- OpenTelemetry Profiles concepts documentation: https://opentelemetry.io/docs/concepts/signals/profiles/
- OpenTelemetry Profiles pprof compatibility specification: https://opentelemetry.io/docs/specs/otel/profiles/pprof/
- Grafana State timeline documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/state-timeline/
- Python documentation for dictionaries and control flow syntax: https://docs.python.org/3/

## Issues Found
- The Docker command used a non-current/unsupported image reference and environment variables that are not part of the official OpenTelemetry Collector eBPF Profiling Distribution configuration. Replaced it with a Collector YAML configuration using the `profiling` receiver, `samples_per_second`, an OTLP profiles pipeline, the official `otel/opentelemetry-collector-ebpf-profiler:0.152.0` image, and the required profiles feature gate.
- The post described OpenTelemetry profiles as simply using the pprof format with thread labels. Updated the wording to say profiles are exported through OTLP and are compatible with pprof-style profile data, with samples carrying attributes such as `thread.id`.
- The Python example assumed a JSON pprof shape with `labels` and `timestamp_ns`. Updated the example to operate on decoded profile samples with `attributes`, `timestamps_unix_nano`, and stack traces, matching the OpenTelemetry profile model more closely.
- The Grafana section referred to a generic timeline/table panel. Updated it to name Grafana's State timeline visualization and its expected table-shaped state-change data.

## Review Notes
OpenTelemetry Profiles are still a developing signal, so version-specific details around profile schemas, collector feature gates, and supported backends may continue to change. The example remains a conceptual transformation step; production use should decode OTLP Profiles with generated protobuf APIs or backend-native query results rather than assuming raw JSON input.

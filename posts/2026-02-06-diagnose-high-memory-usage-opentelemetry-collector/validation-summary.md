# Validation Summary: How to Diagnose High Memory Usage in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- Collector internal telemetry metrics
- Prometheus metrics endpoint
- Go pprof heap and goroutine profiling
- OTLP receiver and exporter configuration
- Exporter sending queues and retry settings
- Attributes, transform, batch, tail sampling, groupbytrace, and probabilistic sampler processors
- Kubernetes memory limit sizing guidance

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector pprof extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/pprofextension
- OpenTelemetry Collector exporter helper queue configuration source: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/exporterhelper
- OpenTelemetry Collector attributes processor source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/attributesprocessor
- OpenTelemetry Collector transform processor README and OTTL function documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Collector memory limiter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/memorylimiterprocessor
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- OpenTelemetry Collector groupbytrace processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/groupbytraceprocessor
- Go pprof documentation: https://pkg.go.dev/net/http/pprof

## Issues Found
- The runtime memory metric examples omitted the current `otelcol_` metric prefix and referenced `process_runtime_heap_sys_bytes`, which is not the current Collector runtime metric name. Updated the examples to use `otelcol_process_runtime_total_alloc_bytes`, `otelcol_process_runtime_heap_alloc_bytes`, and `otelcol_process_runtime_total_sys_memory_bytes`, and adjusted the explanatory text to include `otelcol_process_memory_rss`.
- The attributes processor snippet used `action: truncate` with `max_length`, which is not a supported attributes processor action. Removed that action and moved URL truncation into the transform processor using OTTL `set`, `Substring`, `IsString`, and `Len`.
- The Collector telemetry configuration used the removed/obsolete `service.telemetry.metrics.address` form. Updated it to the current `service.telemetry.metrics.readers.pull.exporter.prometheus.host` and `port` configuration.
- The lead-in text said only the attributes processor was used for cardinality reduction after the snippet was corrected to include the transform processor. Updated the wording to mention both processors.

## Review Notes
- The `go tool pprof` commands are consistent with standard pprof usage, but `go` is not installed in the local review environment, so the commands could not be executed locally.
- Queue, retry, pprof, batch, tail sampling, groupbytrace, and probabilistic sampler configuration examples are technically aligned with current Collector documentation.

# Validation Summary: How to Fix 'Memory Limit Exceeded' Collector Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector memory_limiter processor
- OpenTelemetry Collector batch, filter, transform, and attributes processors
- OpenTelemetry Collector OTLP/OTLP HTTP exporters and sending queues
- OpenTelemetry Collector internal telemetry, pprof, and zPages
- Kubernetes resource limits
- Go runtime `GOMEMLIMIT`

## Sources Consulted
- OpenTelemetry Collector memory limiter processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector exporter helper and sending queue documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector zPages extension documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/extension/zpagesextension/README.md
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector batch processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector contrib filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector contrib attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector OTLP receiver documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- Go runtime `GOMEMLIMIT` documentation: https://pkg.go.dev/runtime

## Issues Found
- The memory limiter examples described the hard limit as the point where data is dropped. The current Collector documentation says the processor starts refusing data above the soft limit and forces garbage collection above the hard limit. I updated the comments and the diagram to reflect refused data, upstream retry/drop behavior, and forced GC.
- The exporter queue section said queues grow unbounded and that the oldest items are dropped when the queue is full. Current exporter helper documentation defines bounded `queue_size` behavior and says enqueue failures typically reject/drop incoming data unless `block_on_overflow` is enabled. I corrected the explanation and queue comments.
- The `otlphttp` queue example defined `sending_queue` twice, which would cause one mapping to override the other in YAML parsers. I merged the persistent storage setting into the existing `sending_queue` block.
- The filter processor examples used the legacy `traces.span` and `logs.log_record` configuration style. Current contrib documentation marks those legacy keys as deprecated, so I changed them to `trace_conditions` and `log_conditions` with current OTTL paths.
- The internal telemetry examples used `service.telemetry.metrics.address`, which is ignored as of OpenTelemetry Collector v0.123.0. I replaced it with the current `readers.pull.exporter.prometheus` configuration.
- The monitoring section referenced `otelcol_processor_dropped_spans` for memory limiter behavior. I changed this to `otelcol_processor_refused_spans`, which is the documented signal for data refused by processors such as memory_limiter.
- The zPages notes claimed TraceZ shows memory usage and PipelineZ shows exporter queue depths. Current zPages documentation describes TraceZ as latency/error sample diagnostics and PipelineZ as pipeline/component status. I corrected the notes.

## Review Notes
- I could not run `otelcol` or `otelcol-contrib` locally because neither binary is installed in this workspace, so validation was performed against official documentation rather than by executing the full configuration.
- The examples use `otel/opentelemetry-collector-contrib:latest`. For production, pinning a specific Collector version would make future validation and rollbacks safer.

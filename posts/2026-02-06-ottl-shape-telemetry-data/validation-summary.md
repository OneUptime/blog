# Validation Summary: How to Use the OpenTelemetry Transformation Language to Shape Telemetry Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- Filter processor
- Tail sampling processor
- Attributes processor
- telemetrygen
- OTLP collector configuration

## Sources Consulted
- OpenTelemetry Collector Transform Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Filter Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OTTL Functions README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OTTL Span Context README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlspan/README.md
- OTTL Log Context README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- OTTL Metric Context README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlmetric/README.md
- OTTL DataPoint Context README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottldatapoint/README.md
- OpenTelemetry Collector Tail Sampling Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- telemetrygen README and trace config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/cmd/telemetrygen

## Issues Found
- The post used `drop()` inside the transform processor. Current OpenTelemetry Collector docs use the filter processor with OTTL boolean conditions for dropping telemetry. I changed span, metric, and log dropping examples to `filter` processor `trace_conditions`, `metric_conditions`, and `log_conditions`.
- Several examples used `span.duration`, which is not a supported span context path. I changed duration checks to subtract `span.start_time` from `span.end_time` and compare with `Duration(...)`.
- Metric rename examples used bare `name` paths. I changed them to `metric.name`, matching the current metric context paths.
- Regex replacement used `$1` in Collector YAML. OTTL docs require escaping `$` as `$$` in Collector configuration, so I changed it to `$$1`.
- `ExtractPatterns` examples used indexed captures and named groups with dots. The converter returns a map from named captures, and Go regexp group names cannot contain dots. I changed these to underscore capture names and map lookups.
- Log examples used bare `body`, `severity_text`, and `attributes` paths in places where current docs expose `log.body`, `log.severity_text`, and `log.attributes`. I updated those paths.
- The tail sampling example set `is_slow` as a boolean but sampled it with a `string_attribute` policy. I changed it to a `boolean_attribute` policy.
- The testing config incorrectly configured `debug` as both a processor and exporter. I removed it from `processors` and left it as a debug exporter.
- The performance guidance referred to placing drop statements early. I updated it to refer to placing filter processors early.

## Review Notes
Downloaded and used `otelcol-contrib` version 0.149.0 to validate representative corrected transform, filter, metric, log, and tail sampling configurations. YAML code blocks in the post were also parsed successfully. The workspace does not have `go` installed, so telemetrygen help could not be executed locally; the `--status-code` flag was verified against current upstream telemetrygen source.

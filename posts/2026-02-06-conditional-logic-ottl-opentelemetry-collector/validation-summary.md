# Validation Summary: How to Use Conditional Logic in OTTL for the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- Filter processor
- OTLP and filelog receivers
- OTLP and debug exporters

## Sources Consulted
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OTTL package documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/README.md
- OTTL language grammar: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/LANGUAGE.md
- OTTL functions reference: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OTTL log context reference: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- OpenTelemetry log proto definition: https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/logs/v1/logs.proto
- OpenTelemetry Collector transforming telemetry docs: https://opentelemetry.io/docs/collector/transforming-telemetry/

## Issues Found
- Replaced invalid `time_now()` calls with the official OTTL `Now()` converter and used `UnixNano(Now())` where nanosecond arithmetic was required.
- Replaced invalid `DayOfWeek()` calls with the official OTTL `Weekday()` converter.
- Updated log trace ID nil checks to compare against the all-zero `TraceID(...)`, as the log context documentation says TraceIDs should not be checked against `nil`.
- Replaced `trace_flags` with `flags` in the log context example, matching the OTLP log record field.
- Updated `ExtractPatterns` examples to use named capture groups and index the returned map. The function requires at least one named capture group.
- Updated the filter processor example from the older `logs.log_record` shape to the current `log_conditions` configuration.
- Replaced invalid temporary variable paths with `log.cache[...]`, which is the supported temporary cache for log context.
- Corrected the case-conversion function reference from `Lower()` to `ToLowerCase()`.
- Narrowed the nil-handling guidance so it accurately describes errors from converters and functions rather than all map-value access.
- Changed a misleading comment that described an unused exporter as conditional routing.

## Review Notes
The transform processor documentation for current versions documents prefixed paths such as `log.body`, while existing OTTL examples also show log-context aliases such as `body`, `attributes`, and `severity_number`. The post keeps the author's alias-heavy style and only corrects examples that were technically invalid.

# Validation Summary: How to Transform Log Bodies Using OTTL in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- Filelog receiver
- YAML Collector configuration
- Regular expression based log processing

## Sources Consulted
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTTL functions documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector telemetry transformation documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry logs specification: https://opentelemetry.io/docs/specs/otel/logs/
- Local validation with `otel/opentelemetry-collector-contrib:latest` version 0.153.0 using `otelcol-contrib validate`.

## Issues Found
- The basic uppercase example used `Upper(body)`, which is not the documented OTTL converter. Replaced it with `ConvertCase(log.body, "upper")` and guarded it with `IsString(log.body)`.
- The transform examples used the older unprefixed `body`, `attributes`, `severity_text`, and `trace_id` paths inside `context: log` groups. Updated examples to the current documented path style using `log.body`, `log.attributes`, `log.severity_text`, `log.trace_id`, and `resource.attributes`.
- `ExtractPatterns` examples used unnamed regular expressions and assigned the returned map directly to scalar attributes. Updated extraction examples to use named capture groups and `merge_maps(..., "upsert")`, which matches the documented return type.
- The `has_error` example attempted to set an attribute from a boolean expression containing `and`, which failed Collector validation in current OTTL syntax. Changed it to set the attribute to `true` only when the `where` condition matches.
- The structured body example used `time_now()`, which is not the documented OTTL time converter. Replaced it with `Now()` and retained `UnixMicro(...)`.
- The normalization example created an undeclared temporary variable `temp_is_nginx` and then used `ExtractPatterns` incorrectly for a scalar status code. Replaced this with a direct `where` condition and a `log.cache` intermediate map populated with a named capture group.
- Added `IsString` and `IsMap` guards where functions require string or map inputs, preventing avoidable runtime errors on non-string or non-map log bodies.
- The email regex used `[A-Z|a-z]`, which includes a literal pipe character in the character class. Corrected it to `[A-Za-z]`.
- The complete pipeline example contained the same invalid `ExtractPatterns` and unprefixed path issues. Updated it and validated the resulting Collector configuration with Collector Contrib 0.153.0.

## Review Notes
- The filelog receiver, OTLP receiver, memory limiter processor, batch processor, transform processor, OTLP exporter, and debug exporter configuration fields used in the complete example are valid for the current Collector Contrib distribution tested.
- The linked OpenTelemetry documentation URL is appropriate. Internal OneUptime cross-links were plausible but were not treated as authoritative technical sources for OTTL behavior.

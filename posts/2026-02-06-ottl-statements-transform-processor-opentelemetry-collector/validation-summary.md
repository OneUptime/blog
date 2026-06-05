# Validation Summary: How to Write OTTL Statements for the Transform Processor

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Transform processor
- OpenTelemetry Transformation Language (OTTL)
- Collector YAML configuration
- Telemetry transformations for traces, metrics, logs, resources, spans, span events, and data points

## Sources Consulted
- OpenTelemetry Collector Contrib Transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib OTTL function reference: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector telemetry transformation documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/

## Issues Found
- Replaced unsupported `Uppercase()` and `Lowercase()` examples with the documented `ToUpperCase()` and `ToLowerCase()` converters.
- Replaced unsupported `Replace()` and incorrectly capitalized `ReplacePattern()` examples with the documented `replace_pattern()` editor.
- Corrected span duration examples to use `UnixNano(end_time) - UnixNano(start_time)` instead of subtracting `time.Time` values directly.
- Replaced unsupported `DayOfWeek()` with the documented `Weekday()` converter.
- Replaced unsupported `Contains()` with the documented `ContainsValue()` converter.
- Replaced array concatenation through `Concat()` with `append()`, since `Concat()` is a string converter and `append()` is the documented array editor.
- Corrected `ExtractPatterns()` examples to use named capture groups and map access, since `ExtractPatterns()` returns a map of named captures rather than an indexed list.
- Replaced unsupported `SplitPattern()` with a documented `Split()` example.
- Replaced unsupported `JSON()` serialization example with `ToKeyValueString()` and adjusted nearby wording to avoid claiming JSON serialization support.
- Corrected the metric name normalization example to use `replace_pattern(metric.name, "\\.", "_")`.

## Review Notes
The post uses the advanced transform processor configuration style with explicit `context` groups. Current transform processor documentation also documents a newer basic style with context inference for Collector Contrib v0.120.0 and later, but the older explicit-context style remains supported.

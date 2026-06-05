# Validation Summary: How to Configure the Transform Processor in the OpenTelemetry Collector

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector transform processor
- OTTL (OpenTelemetry Transformation Language)
- OTLP receiver and OTLP HTTP exporter
- Collector debug exporter
- Collector internal telemetry

## Sources Consulted
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OTTL function reference package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs
- OTTL span context paths and enums: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlspan
- OTTL datapoint context paths: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottldatapoint
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector logging exporter removal announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- Local validation with `otel/opentelemetry-collector-contrib:latest` using `otelcol-contrib validate`.

## Issues Found
- Several `Concat()` examples omitted the required delimiter argument. Updated them to use `Concat(values, delimiter)` according to the current OTTL function signature.
- Replaced non-current `IndexOf()` usage with the documented `Index()` converter and adjusted `Substring()` length calculations so the third argument is a length, not an end index.
- Replaced invalid `ReplaceAll()` / `ReplaceAllPatterns()` converter-style examples with current editor functions such as `replace_pattern()`.
- Replaced `LowerCase()` with the documented `ToLowerCase()` converter.
- Changed boolean expressions inside `set()` calls to `set(..., true/false) where ...` because Collector validation rejects comparison expressions as direct `set` values.
- Replaced the non-existent `duration` span path with calculations based on `end_time_unix_nano - start_time_unix_nano`.
- Updated the datapoint `Hour()` example to use `time`, because `Hour()` expects a `time.Time` value and `time_unix_nano` is an integer.
- Added an `IsString(body)` guard before parsing JSON log bodies with `ParseJSON(body)`.
- Replaced the removed `logging` exporter in the testing configuration with the current `debug` exporter.

## Review Notes
Representative corrected transform statements and the opening full Collector configuration were validated with `otelcol-contrib validate` from the local `otel/opentelemetry-collector-contrib:latest` Docker image. The post remains version-general; future updates should re-check OTTL function signatures because transform processor syntax continues to evolve.

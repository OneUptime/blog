# Validation Summary: How to Configure the Logs Transform Processor in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib transform processor
- OpenTelemetry Transformation Language (OTTL)
- OTLP receiver and OTLP HTTP exporter
- Batch processor
- Memory limiter processor
- Debug exporter
- OneUptime OTLP log ingestion

## Sources Consulted
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OTTL functions README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OTTL log context README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- OpenTelemetry logs data model: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector batchprocessor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor
- OpenTelemetry Collector Helm default configuration showing memory_limiter check_interval and debug exporter: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- Current collector validation using `otel/opentelemetry-collector-contrib:latest validate --config`

## Issues Found
- `ExtractPatterns()` was described and used as if it returned a positional array. Current OTTL documentation shows regex extraction with named capture groups returning a map. Updated examples to use named capture groups and map lookups.
- Several examples used the undocumented `matches` operator. Replaced those conditions with documented `IsMatch()` calls.
- Several examples used `delete(...)`, which is not the documented OTTL map deletion function. Replaced it with `delete_key(...)`.
- `Concat()` was called without the required delimiter argument, and status code values could be numeric. Updated the HTTP status-class example to convert to string and pass a delimiter.
- Examples used `ToLower(...)` and `ToUpper(...)`, but the documented OTTL converters are `ToLowerCase(...)` and `ToUpperCase(...)`. Updated the examples.
- Several log-context examples referenced resource attributes as `resource["..."]`. Updated those to `resource.attributes["..."]`.
- The business-hours example tried to derive an hour from the decimal string form of `time_unix_nano`, which does not represent a timestamp hour. Updated it to use `Hour(time)`.
- The debugging example used the deprecated/removed `logging` exporter and `loglevel`. Updated it to use the current `debug` exporter with `verbosity: detailed`.
- Batch examples set `send_batch_max_size` lower than the current default `send_batch_size` of 8192, which fails validation. Added matching `send_batch_size` values to each batch configuration.
- Memory limiter examples omitted `check_interval`, which fails current collector validation when using explicit memory limits. Added `check_interval: 5s`.

## Review Notes
The first configuration is complete. Later snippets are partial examples that assume the same `otlp` receiver pattern from the basic configuration. The corrected basic and production configurations were validated with the current OpenTelemetry Collector Contrib container image.

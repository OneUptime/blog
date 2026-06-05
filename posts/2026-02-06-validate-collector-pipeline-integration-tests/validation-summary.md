# Validation Summary: How to Validate OpenTelemetry Collector Pipeline Configurations with End-to-End

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OTLP/HTTP JSON
- OpenTelemetry Collector filter, resource, transform, batch processors
- OpenTelemetry Collector otlphttp exporter
- OpenTelemetry Collector health_check extension
- Python pytest integration tests
- GitHub Actions

## Sources Consulted
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector v0.96.0 filter processor README: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/v0.96.0/processor/filterprocessor/README.md
- OpenTelemetry Collector v0.96.0 transform processor README: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/v0.96.0/processor/transformprocessor/README.md
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector-releases

## Issues Found
- The Collector configuration did not configure or enable the `health_check` extension, but the pytest fixture waited on `http://localhost:13133/`. Added the `health_check` extension and enabled it under `service.extensions`.
- The filter processor example used the older `traces.span` configuration shape. Updated it to the current documented `trace_conditions` form with `span.attributes[...]` paths and `error_mode: ignore`.
- The transform snippet described the operation as a rename, but the OTTL `set` statement copies the value and leaves the original attribute in place. Updated the comment to describe copying to the current semantic convention name.
- The transform processor snippet omitted `error_mode`; with older Collector behavior this could propagate statement errors and drop payloads. Added `error_mode: ignore`, matching the recommended resilient behavior.
- The mock backend imported `MessageToDict` from `google.protobuf.json_format` but only parsed OTLP/HTTP JSON. Removed the unused import to avoid requiring the protobuf package unnecessarily.
- The GitHub Actions example pinned `otelcol-contrib` to v0.96.0, an old 2024 release. Updated the download URL to v0.153.0, the latest official Collector release found during review.

## Review Notes
The test code sends OTLP/HTTP JSON with hex-encoded `traceId` and `spanId`, integer enum values, lowerCamelCase field names, and decimal strings for 64-bit integer fields, which matches the OTLP JSON mapping. The tests use fixed sleeps to wait for batch export; this is acceptable for an example, but polling the mock backend would make real CI tests less timing-sensitive.

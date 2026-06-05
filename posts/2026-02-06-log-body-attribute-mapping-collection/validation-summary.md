# Validation Summary: How to Configure Log Body and Attribute Mapping in Log Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Logs data model
- OTLP log records
- File Log receiver
- Stanza log operators: JSON parser, regex parser, key-value parser, move, remove, severity parser
- Transform processor and OTTL
- Resource detection processor
- Kubernetes log file metadata

## Sources Consulted
- OpenTelemetry Collector Contrib File Log Receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib Stanza JSON parser documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md
- OpenTelemetry Collector Contrib Stanza regex parser documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Collector Contrib Stanza key-value parser documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/key_value_parser.md
- OpenTelemetry Collector Contrib Stanza severity parser documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/severity_parser.md
- OpenTelemetry Collector Contrib severity parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/severity.md
- OpenTelemetry Collector Contrib Transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib OTTL functions documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector Contrib OTTL Log Context documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- OpenTelemetry Collector Contrib Resource Detection processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Logs Data Model specification: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/logs/data-model.md
- OpenTelemetry trace context in non-OTLP log formats specification: https://opentelemetry.io/docs/specs/otel/compatibility/logging_trace_context/

## Issues Found
- Updated Collector receiver IDs from the deprecated `filelog/...` alias to the current `file_log/...` component type. Validation with `otelcol-contrib 0.153.0` reported `filelog` as a deprecated alias.
- Corrected the JSON parser comment to say parsed JSON fields go to log attributes by default, matching the `json_parser` default `parse_to: attributes`.
- Updated the sample JSON timestamp to include fractional seconds so it matches the configured `"%Y-%m-%dT%H:%M:%S.%fZ"` layout.
- Fixed the unstructured text example so the `key_value_parser` parses a captured key-value tail from `attributes.kvpairs` instead of trying to parse the whole free-form log body.
- Updated OTTL examples to use current log-context paths such as `log.body`, `log.attributes`, `log.severity_text`, `log.trace_id`, and `log.span_id`.
- Replaced the transform example's trace/span ID assignment with `TraceID(...)` and `SpanID(...)`, as OTTL log context documentation requires pdata ID conversion functions for these fields.
- Replaced `ConvertCase(..., "upper")` with the documented `ToUpperCase(...)` function and added `error_mode: ignore` to transform examples.
- Added `include_file_path: true` to the Kubernetes file path parsing example because `log.file.path` is not added by default.
- Updated the complete configuration from deprecated `resourcedetection` to the current `resource_detection` processor type.
- Clarified the severity mapping explanation so it does not imply every distinct level maps to one single severity number.

## Review Notes
Validated representative complete and standalone Collector configurations with `otelcol-contrib 0.153.0 validate`. The article remains version-neutral, but the examples now follow the current non-deprecated component names as of Collector Contrib 0.153.0.

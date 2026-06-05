# Validation Summary: How to Handle Multiline Java Stack Traces in the Filelog Receiver with

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib filelog receiver
- Stanza log operators
- Java stack traces
- YAML configuration

## Sources Consulted
- OpenTelemetry Collector Contrib filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib regex_parser operator docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Collector Contrib move operator docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/move.md
- OpenTelemetry Collector Contrib remove operator docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/remove.md
- OpenTelemetry Collector Contrib timestamp parsing docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Collector Contrib field syntax docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/field.md
- OpenTelemetry Collector Contrib on_error docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/on_error.md

## Issues Found
- The complete configuration reused `regex_parser`, `move`, and `remove` operator types without unique `id` values. The filelog receiver documentation states that repeated operator types must specify unique IDs because the default ID is the operator type. Added unique IDs to each repeated operator.
- The second `regex_parser` used `preserve_to: body`, which is not a current documented or implemented field for the Stanza `regex_parser` operator. Removed it. With the default `parse_to: attributes`, parsing the body extracts fields into attributes without replacing the body.

## Review Notes
The multiline configuration is technically accurate: `multiline.line_start_pattern` is a supported filelog receiver setting, and `force_flush_period` is a receiver-level setting with a documented default of `500ms`. The timestamp layout using `%Y-%m-%d %H:%M:%S.%L`, the field references such as `attributes.timestamp` and `attributes["exception.type"]`, and the `on_error: send` behavior align with current Stanza documentation.

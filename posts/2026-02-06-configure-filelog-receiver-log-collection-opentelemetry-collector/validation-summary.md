# Validation Summary: How to Configure the Filelog Receiver for Log Collection

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Filelog Receiver
- Stanza log operators
- JSON, regex, CSV, and multiline log parsing
- Kubernetes container log collection
- OTLP exporter
- Batch and memory limiter processors

## Sources Consulted
- OpenTelemetry Collector Contrib File Log Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Stanza operators documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/README.md
- OpenTelemetry Stanza json_parser documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md
- OpenTelemetry Stanza regex_parser documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Stanza router documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/router.md
- OpenTelemetry Stanza severity parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/severity.md
- OpenTelemetry Stanza timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Collector logging exporter removal announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OpenTelemetry Logs Data Model: https://opentelemetry.io/docs/specs/otel/logs/data-model/

## Issues Found
- Replaced the removed `logging` exporter and deprecated `loglevel` option with the current `debug` exporter using `verbosity: detailed`.
- Corrected the `start_at` explanation to clarify that restart-persistent checkpoints require a configured `storage` extension; otherwise offsets are in memory only.
- Fixed the NGINX severity mapping example. The original YAML repeated the `range` key and did not match the documented severity `mapping` syntax; it now uses `2xx`, `4xx`, and `5xx` mappings.
- Fixed the router example. The original default route was written as a route without an `expr`, and the text incorrectly described Stanza router expressions as OTTL. The example now uses the documented `default` field and describes Stanza expression syntax.
- Clarified the CSV `header_attribute` explanation so it does not imply that the CSV parser automatically reads the first file line as a dynamic header.
- Added `include_file_path: true` to Kubernetes examples that parse `attributes["log.file.path"]`, because the Filelog Receiver does not include that attribute by default.
- Narrowed the Kubernetes runtime-log description from Docker/containerd to CRI-style logs, matching the regex shown in the examples.
- Adjusted the conditional JSON parser expression to match the documented Stanza `body matches "^{.*}$"` style.

## Review Notes
The post is technically relevant and validated after the corrections above. Future improvements could show a `storage` extension example for durable offset tracking and use the dedicated `container` operator for Kubernetes logs, but those are enhancements rather than required fixes.

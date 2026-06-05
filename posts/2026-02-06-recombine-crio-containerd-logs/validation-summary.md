# Validation Summary: How to Recombine Partial CRI-O and containerd Container Logs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector filelog receiver
- OpenTelemetry stanza regex_parser, recombine, severity_parser, move, and remove operators
- Kubernetes CRI container log format
- CRI-O and containerd container logs
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector Contrib filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib recombine operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/recombine.md
- OpenTelemetry Collector Contrib regex_parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Collector Contrib severity_parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/severity_parser.md
- OpenTelemetry Collector Contrib timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Collector Contrib container operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/container.md
- Kubernetes Logging Architecture documentation: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- OpenTelemetry blog: Introducing the new container log parser for OpenTelemetry Collector: https://opentelemetry.io/blog/2024/otel-collector-container-log-parser/

## Issues Found
- The timestamp layouts used `%L`, which parses milliseconds, while the CRI examples use 9-digit nanosecond timestamps. Updated the Zulu timestamp examples to `%Y-%m-%dT%H:%M:%S.%sZ`.
- The CRI-O timezone-offset example used `%z`, which matches offsets like `+0000`, while the shown timestamp uses a colon-form offset like `+00:00`. Updated the layout to `%Y-%m-%dT%H:%M:%S.%s%j`.
- The first recombine snippet used `source_identifier: attributes["log.file.path"]` without enabling `include_file_path`. Added `include_file_path: true` so the field exists.
- The complete configuration included `preserve_to` on a `regex_parser`, but that is not a supported regex_parser field. Removed it; parsing from `attributes["log.file.path"]` does not remove the original field.

## Review Notes
- The current OpenTelemetry `container` operator can parse Docker, CRI-O, and containerd logs and automatically recombine CRI partial logs. The post's manual `regex_parser` plus `recombine` approach remains valid when fine-grained control is needed.

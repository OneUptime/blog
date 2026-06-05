# Validation Summary: How to Build Multi-Line Log Parsing for Stack Traces

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib filelog receiver
- Stanza multiline parsing
- Stanza regex_parser and recombine operators
- Java, Python, Go, .NET, and Kubernetes CRI log formats

## Sources Consulted
- OpenTelemetry Collector Contrib filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Stanza regex_parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Stanza recombine operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/recombine.md
- OpenTelemetry Stanza timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Stanza container operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/container.md
- OpenTelemetry log data model specification: https://opentelemetry.io/docs/specs/otel/logs/data-model/

## Issues Found
- The Java example's regex required millisecond precision while the surrounding example and comment used second-level timestamps. Updated the regex and timestamp layout to parse the shown `YYYY-MM-DD HH:MM:SS` format.
- The Python multiline snippet comment said Python logging typically starts with a log level, but the configured pattern matches a timestamp and separator. Updated the comment to match the pattern.
- The Kubernetes CRI recombine example used `attributes["log.file.path"]` as the recombine `source_identifier`, but the filelog receiver does not include `log.file.path` by default. Added `include_file_path: true`.
- The CRI timestamp parser used a millisecond-only UTC layout. CRI/containerd timestamps commonly include nanoseconds and CRI-O may include numeric offsets, so the snippet now uses `layout_type: gotime` with a nanosecond/offset-capable layout.
- The recombine example described `combine_with` as the flush timeout. Added `force_flush_period: 5s` for the timeout and clarified that `combine_with` is the separator inserted between combined entries.

## Review Notes
The post is technically relevant and the overall explanation is consistent with the filelog receiver and Stanza operator model. The Kubernetes section could also mention the built-in `container` operator in a future revision, because it handles Docker, CRI-O, and containerd parsing and partial log recombination, but the existing manual operator chain is valid after the corrections above.

# Validation Summary: How to Parse JSON-Formatted Application Logs with the json_parser Operator

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- Filelog receiver
- Stanza `json_parser`, `router`, `move`, `remove`, and `noop` operators
- Timestamp parsing
- Severity parsing
- Go Zap logger JSON output

## Sources Consulted
- OpenTelemetry Collector Contrib filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib `json_parser` operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md
- OpenTelemetry Collector Contrib timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Collector Contrib severity parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/severity.md
- OpenTelemetry Collector Contrib field syntax documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/field.md
- OpenTelemetry Collector Contrib router operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/router.md
- OpenTelemetry Collector Contrib move/remove operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/move.md
- OpenTelemetry Collector Contrib `on_error` documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/on_error.md
- Zap production encoder configuration: https://github.com/uber-go/zap/blob/master/config.go

## Issues Found
- The ISO 8601 offset timestamp example used `%z` for a `+05:30` offset. OpenTelemetry stanza timestamp docs define `%z` for offsets like `+0530`; `%j` is the directive for offsets like `+05:30`. Updated the layout to `%Y-%m-%dT%H:%M:%S.%L%j`.
- The examples that parse timestamps ending in literal `Z` did not specify UTC. Since stanza timestamp parsing uses the configured/default location when the layout does not parse a timezone, added `location: UTC` to those examples.
- The severity mapping grouped `TRACE` under `debug`. OpenTelemetry severity parsing has a separate `trace` severity alias, so the mapping now uses `debug` for debug values and `trace` for trace values.
- The Unix epoch examples used `1738851825.123`, which corresponds to 2025-02-06T14:23:45.123Z, while the surrounding examples use 2026-02-06. Updated the epoch seconds and milliseconds examples to `1770387825.123` and `1770387825123`.
- The nested JSON section said `json_parser` flattens nested objects with dot notation. The stanza docs show JSON is parsed into maps and field paths traverse nested maps. Updated the explanation and move examples to use `attributes.context.query`, `attributes.context.duration_ms`, and `attributes.context.database`.
- The router example sent entries to branch operators but did not set explicit branch outputs. Because operators default to the next operator in the pipeline, branch operators could fall through into each other. Added a `parsed_done` noop and explicit `output` values for each branch.

## Review Notes
All fenced JSON and YAML snippets were parsed locally after the edits. The snippets are configuration examples and were not executed against a live OpenTelemetry Collector binary in this workspace.

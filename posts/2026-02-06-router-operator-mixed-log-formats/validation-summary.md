# Validation Summary: How to Use the Router Operator to Handle Mixed Log Formats in One Pipeline

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib filelog receiver
- Stanza router operator
- Stanza regex_parser, json_parser, severity_parser, add, and noop operators
- Collector resource and batch processors
- OTLP exporter
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector Contrib filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib router operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/router.md
- OpenTelemetry Collector Contrib regex_parser documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Collector Contrib json_parser documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md
- OpenTelemetry Collector Contrib severity_parser documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/severity_parser.md
- OpenTelemetry Collector Contrib timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Collector Contrib on_error parameter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/on_error.md
- OpenTelemetry Collector Contrib field and expression documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/field.md and https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/expression.md
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector Contrib resource processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md

## Issues Found
- The parser examples used `on_error: tag_unknown` and `on_error: keep_raw`, but `on_error` only accepts `drop`, `drop_quiet`, `send`, and `send_quiet`. Removed those invalid `on_error` values so the examples use the documented default behavior.
- The NGINX timestamp examples used a Go time layout (`02/Jan/2006:15:04:05 -0700`) without setting `layout_type: gotime`. Added `layout_type: gotime` in both NGINX parser examples so the timestamp layout is interpreted correctly.

## Review Notes
All YAML snippets parse successfully after the fixes. The router behavior, route/default fields, file path attributes, parser fields, severity mapping, resource processor, batch processor, and OTLP exporter structure align with the consulted OpenTelemetry documentation.

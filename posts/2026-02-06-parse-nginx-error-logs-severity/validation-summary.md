# Validation Summary: How to Parse NGINX Error Logs with Severity Level Extraction

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NGINX error logs
- OpenTelemetry Collector
- OpenTelemetry filelog receiver
- Stanza regex_parser, severity_parser, router, add, move, remove, and noop operators
- OpenTelemetry filter, resource, and batch processors
- OTLP exporter

## Sources Consulted
- OpenTelemetry Collector Contrib filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry stanza regex_parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry stanza severity_parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/severity_parser.md
- OpenTelemetry stanza severity parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/severity.md
- OpenTelemetry stanza timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry stanza router operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/router.md
- OpenTelemetry stanza field syntax documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/field.md
- OpenTelemetry filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Logs Data Model severity table: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/logs/data-model.md
- NGINX logging documentation: https://docs.nginx.com/nginx/admin-guide/monitoring/logging/
- NGINX core module error_log directive documentation: https://nginx.org/en/docs/ngx_core_module.html#error_log

## Issues Found
- The timestamp examples used Go time layout syntax but did not set `layout_type: gotime`. Current stanza documentation defaults timestamp parsing to `strptime`, so I added `layout_type: gotime` wherever the `2006/01/02 15:04:05` layout is used.
- The first parsing chain used multiple `regex_parser` operators without unique IDs. The filelog receiver documentation says repeated operator types need unique IDs, so I added explicit IDs for the main parser and the optional extraction parsers.
- The first parsing chain used `preserve_to`, which is not a documented `regex_parser` field. I removed it; parsing from `attributes.message` into the default `attributes` destination does not overwrite the source message.
- The embedded severity mapping split `emerg`, `alert`, and `crit` across `fatal`, `fatal2`, and `fatal3`, while the post's table describes all three as FATAL. I changed the mapping to `fatal: ["emerg", "alert", "crit"]` and added `overwrite_text: true` so the severity text uses OpenTelemetry's standard short names.
- The filter processor example used the older `logs.log_record` form and referenced `severity_number` without the current documented log context path. I updated it to `log_conditions` with `log.severity_number < SEVERITY_NUMBER_INFO` and added `error_mode: ignore`.
- The router category example routed to `add` operators that would otherwise continue to the next `add` operator and overwrite the category. I added explicit `output: parsed_error` targets and a terminal `noop` operator.
- The error log field description omitted the thread ID between the process ID and connection ID. I updated the description to include the thread ID.

## Review Notes
The corrected filelog parsing snippet, complete Collector configuration, and router category snippet were validated with `otelcol-contrib` v0.153.0 using `otelcol-contrib validate --config`.

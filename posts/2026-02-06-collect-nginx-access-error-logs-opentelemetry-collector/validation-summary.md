# Validation Summary: How to Collect NGINX Access and Error Logs with the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector filelog receiver
- Stanza filelog operators: regex_parser, json_parser, severity_parser, add
- NGINX access logs and error logs
- OTLP HTTP exporter
- OneUptime OTLP ingestion
- Linux file permissions

## Sources Consulted
- OpenTelemetry Collector filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry stanza regex_parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry stanza json_parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md
- OpenTelemetry stanza severity_parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/severity_parser.md
- OpenTelemetry stanza field syntax documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/field.md
- OpenTelemetry stanza timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- NGINX logging documentation: https://docs.nginx.com/nginx/admin-guide/monitoring/logging/
- OneUptime Host OpenTelemetry Collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector
- Expr language type conversion documentation: https://expr-lang.org/docs/Language-Definition

## Issues Found
- The post described the generic OpenTelemetry Collector as supporting the `filelog` receiver. The `filelog` receiver is provided by the OpenTelemetry Collector Contrib distribution, so the text now calls out Collector Contrib where needed.
- The access-log snippet used `field: attributes.http.status_code`, which creates a nested `http.status_code` path rather than an attribute key containing a dot. Updated it to `attributes["http.status_code"]` per stanza field syntax.
- The access-log snippet said it converted the status code to an integer but used `EXPR(attributes.status)`, which only copies the parsed string. Updated it to `EXPR(int(attributes.status))`.
- The HTTP status severity mappings used regex-like strings such as `"2\\d{2}"`. The stanza severity parser supports exact values, ranges, and special HTTP status values such as `2xx`, `3xx`, `4xx`, and `5xx`; the mappings were updated accordingly.
- The error-log severity mapping omitted NGINX's `notice` level. Added `notice` mapped to `info2`.
- The JSON parsing example did not enable integer parsing, so numeric JSON values such as `status` would be parsed as floating-point numbers by default. Added `parse_ints: true`.
- The troubleshooting section said regex parsing fails silently. With the default `on_error: send`, parser errors are emitted in Collector logs and the unparsed record is sent onward, so the troubleshooting guidance was corrected.

## Review Notes
Local `otelcol-contrib`, `otelcol`, `go`, and `nginx` binaries were not installed in the workspace, so runtime validation was not performed. The examples were reviewed statically against official OpenTelemetry, NGINX, and OneUptime documentation.

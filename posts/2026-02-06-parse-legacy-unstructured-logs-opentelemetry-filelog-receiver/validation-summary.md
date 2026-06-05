# Validation Summary: How to Parse Legacy Unstructured Logs into OpenTelemetry Structured Format

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Filelog receiver
- Stanza log operators
- Regex parser operator
- Syslog parser operator
- OpenTelemetry semantic conventions
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector Contrib Filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib Stanza operators documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/README.md
- OpenTelemetry Collector Contrib regex_parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Collector Contrib syslog_parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/syslog_parser.md
- OpenTelemetry Collector Contrib timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Collector Contrib severity parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/severity.md
- OpenTelemetry Collector Contrib field syntax documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/field.md
- OpenTelemetry HTTP semantic convention attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/

## Issues Found
- The timestamp layouts used Go time layout syntax, but Stanza timestamp parsing defaults to `strptime`. Added `layout_type: gotime` to the affected timestamp blocks so the shown layouts parse correctly.
- The custom application log example used multiple `regex_parser` operators in one operator pipeline without unique IDs. Added `id` values to avoid duplicate default operator IDs.
- The Apache example comment claimed it converted `bytes` and `status` to integers, but the shown operator copied only the method. Updated the comment to describe the actual behavior.
- The Apache example used `attributes.http.method`, which creates a nested field path rather than an attribute key containing dots, and `http.method` is deprecated. Updated it to `attributes["http.request.method"]`.
- The syslog example comment said it added facility and priority, but the `syslog_parser` extracts syslog fields and the `add` operator only tags the source. Updated the comment and used bracket field syntax for `attributes["log.source"]`.
- The complete configuration said it handled all three formats but omitted the syslog receiver from both the receiver definitions and logs pipeline. Added `filelog/syslog` and included it in the logs pipeline.
- The semantic convention tip referenced deprecated `http.method`. Updated it to `http.request.method`.

## Review Notes
The examples are technically valid as illustrative Filelog receiver configurations, but a production setup may still need backend-specific OTLP exporter settings such as headers, authentication, TLS options, or an `otlphttp` exporter depending on the destination.

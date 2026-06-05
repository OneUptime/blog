# Validation Summary: How to Parse Apache Combined Access Logs with the Filelog Receiver regex_parser

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib filelog receiver
- Stanza regex_parser, move, remove, timestamp, severity, and on_error configuration
- Apache HTTP Server combined access log format
- OpenTelemetry semantic convention attribute names for HTTP logs

## Sources Consulted
- OpenTelemetry Collector Contrib filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib regex_parser operator docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Collector Contrib timestamp parsing docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Collector Contrib severity parsing docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/severity.md
- OpenTelemetry Collector Contrib on_error docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/on_error.md
- OpenTelemetry Collector Contrib move operator docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/move.md
- OpenTelemetry Collector Contrib remove operator docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/remove.md
- OpenTelemetry semantic conventions for HTTP: https://opentelemetry.io/docs/specs/semconv/http/http-spans/

## Issues Found
- The timestamp layout used Go's reference-time syntax (`02/Jan/2006:15:04:05 -0700`) without setting `layout_type: gotime`. The regex parser timestamp block defaults to `strptime`, so the collector would not parse Apache timestamps correctly. Changed both timestamp layouts to the equivalent `strptime` layout: `%d/%b/%Y:%H:%M:%S %z`.
- The `on_error: send` explanation implied that unparseable lines might otherwise be silently dropped. Current Stanza docs list `send` as the default for `regex_parser`, so the text was changed to say the setting makes the default forwarding behavior explicit.

## Review Notes
- The corrected main collector configuration and the introductory regex parser snippet were validated with the current `otel/opentelemetry-collector-contrib:latest` Docker image using the collector `validate` command.
- The post maps status code and response size attributes as strings because regex capture groups produce strings. OpenTelemetry HTTP semantic conventions define `http.response.status_code` as an integer for spans; future revisions could add explicit type conversion if strict semantic-convention typing for downstream analysis is required.

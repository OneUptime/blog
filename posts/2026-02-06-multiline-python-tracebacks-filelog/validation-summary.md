# Validation Summary: How to Parse Multiline Python Tracebacks with the OpenTelemetry Filelog

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib filelog receiver
- Stanza log operators: regex_parser, json_parser, move, remove
- Python tracebacks and exception chaining
- Python logging formats
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector Contrib filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib Stanza operators README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/README.md
- OpenTelemetry Collector Contrib regex_parser operator docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Collector Contrib move operator docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/move.md
- OpenTelemetry Collector Contrib timestamp parsing docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry logs specification: https://opentelemetry.io/docs/specs/otel/logs/
- Python traceback module documentation: https://docs.python.org/3/library/traceback.html

## Issues Found
- The `regex_parser` examples used `preserve_to: body`, which is not a supported field in the official `regex_parser` operator configuration. Removed that field because `regex_parser` parses into attributes by default and does not replace `body`.
- The exception extraction regex could match the first exception line in a chained traceback and could also capture only the suffix of an exception name when preceded by a greedy wildcard. Updated it to anchor matching at an exception line and select the final exception line in the record.
- The chained exception example used `raise ... from e` while showing the implicit chaining text, "During handling of the above exception, another exception occurred:". Updated the code example to use implicit chaining so the displayed traceback text matches Python behavior.
- The source-location extraction regex did not account for the code-context line between a Python `File` frame line and the final exception line, and it only allowed word characters in function names. Updated it to allow names such as `<module>` and to match the final exception line after the code context.

## Review Notes
- The filelog receiver multiline settings, `start_at`, `force_flush_period`, operator chain structure, timestamp layout directives, severity parsing, JSON parsing, and move/remove operator usage are consistent with the official OpenTelemetry Collector Contrib documentation.
- The `code.lineno` value is extracted as text by the regex parser. Downstream systems that enforce semantic convention value types may require conversion to an integer.

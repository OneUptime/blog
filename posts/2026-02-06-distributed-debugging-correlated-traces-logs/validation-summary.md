# Validation Summary: How to Implement Distributed Debugging with Correlated Traces and Logs

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry trace and span context
- Python standard library logging
- Structured JSON logging
- OpenTelemetry Collector
- OpenTelemetry Collector filelog receiver
- OpenTelemetry Collector stanza json_parser and trace_parser operators
- OTLP HTTP exporter

## Sources Consulted
- OpenTelemetry Python logging instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- OpenTelemetry Python trace span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry Python SDK trace documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Collector filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector stanza json_parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md
- OpenTelemetry Collector stanza trace_parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/trace_parser.md
- OpenTelemetry Collector stanza timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Collector stanza trace parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/trace.md
- OpenTelemetry Collector OTLP HTTP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md

## Issues Found
- The Python logging formatter manually interpolated values into a JSON string, which could produce invalid JSON when messages contained quotes or other characters requiring escaping. Replaced it with a `JSONTraceFormatter` that uses `json.dumps`.
- The Python logging setup added the trace context filter to the root logger, but propagated records from module-level loggers are not reliably processed by ancestor logger filters. Moved the filter to the handler so all records handled by that handler receive trace fields.
- The Collector timestamp layout expected `"YYYY-MM-DD HH:MM:SS"`, while the Python formatter emitted the standard logging `asctime` format by default. Updated the formatter to emit UTC timestamps with microseconds and updated the Collector layout to match.
- The Collector `trace_parser` parsed `trace_id` and `span_id` but omitted `trace_flags`, even though the Python log record populated it and the operator supports it. Added `trace_flags.parse_from`.
- The Collector example used `otlphttp`, which current Collector documentation marks as a deprecated alias. Changed the exporter component name and pipeline references to `otlp_http`.

## Review Notes
The Python examples are syntactically valid, and the Collector YAML parses successfully. The `ContextualLogger` example uses sample application functions and exception types such as `check_inventory`, `charge_customer`, and `PaymentError`; these are placeholders for application code rather than complete runnable definitions.

# Validation Summary: How to implement OpenTelemetry logs integration with traces

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry logs and traces
- OpenTelemetry Python SDK and logging instrumentation
- Python standard library logging
- Winston logging for Node.js
- OpenTelemetry JavaScript API
- OpenTelemetry Java API
- SLF4J MDC and Logback
- OpenTelemetry Collector Contrib filelog receiver
- OpenTelemetry Collector OTLP and OTLP HTTP exporters
- Grafana Loki, Grafana Tempo, and Elasticsearch log querying

## Sources Consulted
- OpenTelemetry Logs specification: https://opentelemetry.io/docs/specs/otel/logs/
- OpenTelemetry Python logging instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- OpenTelemetry Java instrumentation ecosystem documentation: https://opentelemetry.io/docs/languages/java/instrumentation/
- OpenTelemetry Java Logger MDC auto-instrumentation documentation: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/logger-mdc-instrumentation.md
- OpenTelemetry JavaScript context documentation: https://opentelemetry.io/docs/languages/js/context/
- OpenTelemetry Collector Contrib filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib trace_parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/trace_parser.md
- OpenTelemetry Collector Contrib trace parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/trace.md
- Grafana Loki OpenTelemetry Collector ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/

## Issues Found
- The Python logging example called `LoggingInstrumentor().instrument(set_logging_format=True)` and then called `logging.basicConfig()` separately. Python logging only applies the first `basicConfig()` call, so the custom format shown might not take effect. Updated the instrumentation call to pass `logging_format` and `log_level` directly.
- The Java code block was labeled `JavaLoggingExample.java` while declaring a public `OrderService` class, which would not compile as a standalone Java source file. Updated the filename comment to `OrderService.java`.
- The Java `processOrder` method rethrew an `Exception` without declaring it. Added `throws Exception` to `processOrder`, `validateOrder`, and `chargePayment` so the example compiles when those methods perform checked-error work.
- The Java example used `MDC.clear()`, which would remove unrelated MDC fields set elsewhere in the application. Replaced it with removal of only `trace_id` and `span_id`.
- The Collector example used the gRPC `otlp` exporter to send logs to `loki:3100`. Current Grafana Loki documentation requires the `otlphttp` exporter with an endpoint such as `http://loki:3100/otlp` for Loki's native OTLP ingestion endpoint. Updated the logs exporter and pipeline reference.
- The Loki query example used a generic `service` label and string matching. Updated it to use Loki's normalized OpenTelemetry label `service_name` and parse the JSON log line before filtering on `trace_id`.

## Review Notes
The post is technically relevant and salvageable. The Java section still shows a manual MDC approach; official OpenTelemetry Java documentation also recommends using the Java agent or standalone Logback/Log4j context bridge where possible. The Python structured logging example demonstrates context injection fields but does not include a complete tracer/exporter setup; that is acceptable as a focused formatter example.

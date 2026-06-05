# Validation Summary: How to Use OpenTelemetry Log-Trace Correlation to Debug Errors Without

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python logging instrumentation
- OpenTelemetry Java instrumentation with Logback MDC
- OpenTelemetry JavaScript API with Winston
- OpenTelemetry Collector
- Grafana Loki
- Grafana Tempo
- Grafana data source provisioning
- Elasticsearch query syntax

## Sources Consulted
- OpenTelemetry Python Contrib logging instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- OpenTelemetry Java Logback MDC instrumentation README: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/logback/logback-mdc-1.0/library/README.md
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- Grafana Loki OpenTelemetry Collector ingestion documentation: https://grafana.com/docs/enterprise-logs/latest/send-data/otel/
- Grafana Loki native OTLP vs Loki exporter documentation: https://grafana.com/docs/loki/latest/send-data/otel/native_otlp_vs_loki_exporter/
- Grafana Tempo data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- Grafana trace to logs correlation documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/configure-trace-to-logs/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The Python example called `LoggingInstrumentor().instrument(set_logging_format=True)` and then called `logging.basicConfig()` separately. OpenTelemetry's Python logging instrumentation uses `basicConfig()` when `set_logging_format=True`, so the later custom `basicConfig()` call could be ignored. Changed the example to call `LoggingInstrumentor().instrument()` before configuring the desired logging format.
- The post described trace context as being maintained on the current execution thread. That is too narrow for modern async runtimes and OpenTelemetry context propagation. Changed it to "current execution context."
- The Java Logback section said adding the `opentelemetry-logback-mdc` dependency was enough when not using the Java agent. The official Logback MDC library requires the `opentelemetry-logback-mdc-1.0` artifact and a Logback `OpenTelemetryAppender` wrapper. Updated the dependency name and Logback configuration guidance.
- The example trace IDs and span IDs used shortened placeholder values such as `abc123` and `def456`. W3C Trace Context uses 16-byte trace IDs represented as 32 lowercase hex characters and 8-byte span IDs represented as 16 lowercase hex characters. Replaced the examples with valid-length IDs.
- The Collector example used the deprecated Loki exporter and the `/loki/api/v1/push` endpoint. Loki's current OpenTelemetry ingestion path uses the Collector `otlphttp` exporter pointed at Loki's OTLP endpoint. Updated the exporter to `otlphttp/loki` with `endpoint: http://loki:3100/otlp`.
- The Grafana Tempo provisioning example used the older `tracesToLogs` key. Current Grafana provisioning documents the `tracesToLogsV2` block. Updated the key.

## Review Notes
The JavaScript Winston example uses current OpenTelemetry JavaScript API calls for reading the active span context, but it assumes an OpenTelemetry SDK/context manager has already been initialized elsewhere in the application. That is a reasonable omission for a focused logging-format example, but a future expanded tutorial could mention it explicitly.

# Validation Summary: How to Troubleshoot Log Correlation Failures Between Traces and Logs

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- OpenTelemetry traces and logs
- OpenTelemetry Java instrumentation and Logback MDC correlation
- OpenTelemetry Python logging instrumentation and OTLP log export
- OpenTelemetry JavaScript API with Winston logging
- OpenTelemetry Collector OTLP receiver, filelog receiver, transform processor, debug exporter, and Elasticsearch exporter
- Elasticsearch log queries

## Sources Consulted
- OpenTelemetry Java Logback MDC instrumentation: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/logback/logback-mdc-1.0/library/README.md
- OpenTelemetry Java Logger MDC auto-instrumentation: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/logger-mdc-instrumentation.md
- OpenTelemetry Java supported libraries: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/supported-libraries.md
- OpenTelemetry Python logging instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- OpenTelemetry Python logs SDK example: https://github.com/open-telemetry/opentelemetry-python/blob/main/docs/examples/logs/example.py
- OpenTelemetry Collector transform processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector OTTL functions: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector filelog receiver: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector json_parser, regex_parser, timestamp, and trace parsing docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/stanza/docs
- OpenTelemetry Collector Elasticsearch exporter: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/elasticsearchexporter/README.md
- OpenTelemetry JavaScript active span API source: https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/trace/context-utils.ts

## Issues Found
- The Java Logback example mixed the OTLP Logback appender with MDC injection. Updated the config to use `io.opentelemetry.instrumentation.logback.mdc.v1_0.OpenTelemetryAppender`, wrap the console appender, and reference only the wrapped appender from the root logger.
- The Gradle dependency used `opentelemetry-logback-appender-1.0:2.2.0-alpha` for MDC injection. Updated it to the current MDC artifact, `opentelemetry-logback-mdc-1.0:2.28.1-alpha`, and changed the dependency scope to `runtimeOnly`.
- The Python logging comments said `trace_flags` is injected into log records. Updated the comments to match the current injected fields: `otelTraceID`, `otelSpanID`, `otelServiceName`, and `otelTraceSampled`.
- The Python OTLP log exporter snippet configured a `LoggerProvider` and exporter but did not attach a logging handler, so standard Python log records would not be exported. Added `LoggingHandler` and attached it to the root logger.
- The Collector transform example claimed it stripped trace context while only deleting `service.name`. Updated the wording to describe the actual risk: removing service identity can break backend queries or service-scoped correlation.
- The plain-text filelog example used placeholder-sized trace and span IDs in the comment and allowed any hex length in the regex. Updated the example to use 32-character trace IDs and 16-character span IDs.
- The Elasticsearch query checked for `TraceId`, but the current Elasticsearch exporter OTel mapping serializes correlation fields as `trace_id` and `span_id`. Updated the query to check `trace_id` and noted that older mapping modes may use `TraceId`.
- The closing recommendation said logs and traces should go through the same collector pipeline. Logs and traces use separate signal pipelines, so this was changed to the same collector deployment.

## Review Notes
The post is technically relevant and now aligns with the current OpenTelemetry documentation as of 2026-06-05. Some APIs and components referenced in the post remain version-sensitive, especially OpenTelemetry Java alpha instrumentation artifacts, Python logs APIs under `opentelemetry.sdk._logs`, and Elasticsearch exporter mapping behavior.

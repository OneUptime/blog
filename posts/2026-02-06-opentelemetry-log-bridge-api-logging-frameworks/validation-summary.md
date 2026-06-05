# Validation Summary: How to Use the OpenTelemetry Log Bridge API with Existing Logging Frameworks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Logs API and SDK
- OpenTelemetry log bridge pattern
- Python `logging`
- OpenTelemetry Python `LoggingHandler`, log processors, and OTLP exporter
- Java Log4j2 and OpenTelemetry Log4j2 appender
- Node.js Winston and OpenTelemetry Winston instrumentation
- OTLP log export

## Sources Consulted
- OpenTelemetry Logs API specification: https://opentelemetry.io/docs/specs/otel/logs/api/
- OpenTelemetry Logs Data Model specification: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python logs example: https://github.com/open-telemetry/opentelemetry-python/blob/main/docs/examples/logs/example.py
- OpenTelemetry Java Log4j2 appender README: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/log4j/log4j-appender-2.17/library/README.md
- OpenTelemetry Java Spring Boot additional instrumentation docs for Log4j2: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/additional-instrumentations/
- Maven Central metadata for `opentelemetry-log4j-appender-2.17`: https://repo1.maven.org/maven2/io/opentelemetry/instrumentation/opentelemetry-log4j-appender-2.17/maven-metadata.xml
- OpenTelemetry JS Winston instrumentation README: https://github.com/open-telemetry/opentelemetry-js-contrib/blob/main/packages/instrumentation-winston/README.md
- OpenTelemetry JS OTLP gRPC logs exporter README: https://www.npmjs.com/package/@opentelemetry/exporter-logs-otlp-grpc
- OpenTelemetry JS SDK Node package types for `logRecordProcessors`: https://www.npmjs.com/package/@opentelemetry/sdk-node

## Issues Found
- Updated the Log4j2 appender Maven dependency from `2.12.0-alpha` to the current `2.28.1-alpha` release available in Maven Central as of 2026-06-05.
- Added `captureContextDataAttributes="*"` to the Log4j2 appender configuration because `ThreadContext` values are only captured when context data attributes are configured for capture.
- Corrected the `captureExperimentalAttributes` description to say it captures thread name and thread ID, not logger name.
- Added the required `OpenTelemetryAppender.install(openTelemetrySdk)` startup step, because the Log4j2 appender needs access to an OpenTelemetry SDK instance before it can emit log telemetry.
- Updated the Java `processOrder` example to declare `throws Exception`, matching the catch block that rethrows `Exception`.
- Expanded the Winston install command to include `@opentelemetry/winston-transport`, `@opentelemetry/sdk-node`, `@opentelemetry/sdk-logs`, and the OTLP logs exporter required by the example.
- Moved the `winston` import until after `sdk.start()` so the instrumentation is registered before Winston is loaded and loggers are created.
- Replaced the deprecated OpenTelemetry JS `logRecordProcessor` SDK option with `logRecordProcessors`.
- Updated the Winston request example to make the span active with `context.with(trace.setSpan(...))`; a manually started span is not automatically active, so trace context would not otherwise be injected into Winston logs.
- Added `ConsoleLogRecordExporter` to the Python processor/exporter snippet so the commented debugging example references an imported exporter.

## Review Notes
- OpenTelemetry Python logs are still documented as under development, and some package names and class aliases continue to move as the signal stabilizes. The reviewed examples match the current official docs and latest published packages checked during validation.
- The Java Log4j2 appender artifact remains an alpha instrumentation artifact even at the current release version.

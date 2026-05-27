# Validation Summary: How to Send Structured Logs with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Logs
- OpenTelemetry Python SDK
- OpenTelemetry JavaScript SDK
- OTLP log export
- OpenTelemetry Collector
- Trace-log correlation
- Structured logging

## Sources Consulted
- OpenTelemetry Logs Data Model: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- OpenTelemetry Logging specification: https://opentelemetry.io/docs/specs/otel/logs/
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry JavaScript docs: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JavaScript API reference for LoggerProvider: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-logs.LoggerProvider.html
- OpenTelemetry JavaScript API reference for LoggerProviderOptions: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-logs.LoggerProviderOptions.html
- OpenTelemetry JavaScript resources reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript NodeTracerProvider reference: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-node.NodeTracerProvider.html
- OpenTelemetry Collector filter processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector troubleshooting docs for debug exporter: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector logging exporter deprecation notice: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/loggingexporter

## Issues Found
- The Python setup used `ConsoleLogExporter`, but current OpenTelemetry Python docs use `ConsoleLogRecordExporter`. Updated the import and usage.
- The Python setup referenced `ConsoleSpanExporter()` without importing it. Added the missing import from `opentelemetry.sdk.trace.export`.
- The Node.js example used `new Resource(...)`, but the current JavaScript resources package documents `resourceFromAttributes(...)`. Updated the resource creation code.
- The Node.js example configured log processing with `loggerProvider.addLogRecordProcessor(...)`, but current `LoggerProviderOptions` documents processors through the `processors` constructor option. Updated the example accordingly.
- The Node.js example claimed automatic trace context correlation but did not configure a tracer provider, so `trace.getTracer(...)` would use the no-op provider in a standalone example. Added a minimal `NodeTracerProvider` setup so active spans exist and logs can be correlated.
- The Collector example used the deprecated `logging` exporter and deprecated `loglevel` option. Replaced it with the current `debug` exporter and `verbosity`.
- The Collector filter processor example used the legacy `logs.log_record` configuration. Updated it to the current `log_conditions` OTTL form with `log.severity_number < SEVERITY_NUMBER_INFO`.

## Review Notes
- OpenTelemetry JavaScript logs are still marked as development in the language docs, so examples may need future maintenance as the JavaScript logs SDK evolves.
- The Python docs still import logs classes from `opentelemetry.sdk._logs`; this is consistent with current official documentation despite the private-looking module name.

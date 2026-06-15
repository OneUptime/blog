# Validation Summary: How to Configure Log Correlation with Traces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing, context propagation, and log correlation
- TypeScript / Node.js
- Winston logging
- Python logging
- Axios and Express
- Grafana Tempo
- Grafana Loki
- W3C Trace Context

## Sources Consulted
- OpenTelemetry JS NodeSDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JS `@opentelemetry/sdk-node` npm package metadata and type definitions
- OpenTelemetry JS `@opentelemetry/resources` npm package metadata and type definitions
- OpenTelemetry JS `@opentelemetry/semantic-conventions` npm package metadata and type definitions
- OpenTelemetry Winston instrumentation documentation: https://www.npmjs.com/package/@opentelemetry/instrumentation-winston
- OpenTelemetry Python logging instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- Grafana Loki data source derived fields documentation: https://grafana.com/docs/grafana/latest/datasources/loki/configure-loki-data-source/
- Grafana Tempo data source documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/
- Grafana Tempo provisioning and trace-to-logs documentation: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The Winston logger snippet imported unused and misleading OpenTelemetry symbols and attempted to infer a parent span using `trace.getSpan(context.active())`, which returns the active span in that context rather than a parent span. Removed the parent-span block and kept the active span correlation fields.
- The manual Winston correlation snippet emitted `trace_flags` as a number. Updated it to the two-character hexadecimal representation used by W3C Trace Context and OpenTelemetry log correlation.
- The OpenTelemetry NodeSDK example used `new Resource(...)`, `SemanticResourceAttributes`, and singular `spanProcessor` / `logRecordProcessor` options. Updated it to current `resourceFromAttributes`, stable semantic convention constants, and `spanProcessors` / `logRecordProcessors`.
- The NodeSDK example could produce `undefined/v1/traces` and `undefined/v1/logs` when `OTEL_EXPORTER_OTLP_ENDPOINT` was not set. Added a default OTLP HTTP endpoint.
- The OpenTelemetry NodeSDK example configured Winston twice by combining `getNodeAutoInstrumentations()` with a separate `new WinstonInstrumentation(...)`. Moved the Winston `logHook` into the auto-instrumentation configuration.
- The Python sample used `os.environ` without importing `os`. Added the missing import.
- The Python sample called `LoggingInstrumentor().instrument(set_logging_format=True)` while also installing a custom JSON handler, which can add an extra `basicConfig` handler and produce duplicate/non-JSON output. Changed it to register instrumentation without changing the custom JSON log format.
- The Axios propagation snippet used `logger` without importing it. Added the logger import.
- The Axios propagation snippet assigned a plain object to `config.headers`, which is not correct for current Axios header types. Updated it to use `AxiosHeaders`.
- The Grafana provisioning snippet referenced data source UIDs without defining them. Added `uid` fields for Loki and Tempo.
- The Grafana Tempo snippet used the older `tracesToLogs` provisioning block and older tag mapping fields. Updated it to current `tracesToLogsV2` with the documented `tags` mapping shape.
- The troubleshooting TypeScript snippet used OpenTelemetry and Express symbols without imports. Added the missing imports.

## Review Notes
- The query service example remains illustrative pseudo-code because it depends on application-specific store and model types not defined in the article.
- For production Node.js Winston log sending through OpenTelemetry, the official Winston instrumentation documentation notes that `@opentelemetry/winston-transport` must be installed when relying on instrumentation-based log sending.

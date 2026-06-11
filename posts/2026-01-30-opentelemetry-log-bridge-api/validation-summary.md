# Validation Summary: How to Create OpenTelemetry Log Bridge API: A Complete Guide

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Logs Bridge API
- OpenTelemetry JavaScript logs API and SDK
- OTLP HTTP log exporter
- OpenTelemetry resources and semantic conventions
- Winston logging and custom transports
- Pino logging and transports
- TypeScript / Node.js

## Sources Consulted
- OpenTelemetry Logs concepts: https://opentelemetry.io/docs/concepts/signals/logs/
- OpenTelemetry Logs SDK specification: https://opentelemetry.io/docs/specs/otel/logs/sdk/
- OpenTelemetry Logs data model specification: https://opentelemetry.io/docs/specs/otel/logs/data-model/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript API logs reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_api-logs.html
- OpenTelemetry JavaScript `resourceFromAttributes` reference: https://open-telemetry.github.io/opentelemetry-js/functions/_opentelemetry_resources.resourceFromAttributes.html
- Local current package type definitions for `@opentelemetry/api-logs@0.218.0`, `@opentelemetry/sdk-logs@0.218.0`, `@opentelemetry/resources@2.7.1`, `@opentelemetry/semantic-conventions@1.41.1`
- Winston custom transport documentation: https://github.com/winstonjs/winston#adding-custom-transports
- Pino transport documentation: https://github.com/pinojs/pino/blob/main/docs/transports.md
- pino-abstract-transport documentation: https://github.com/pinojs/pino-abstract-transport

## Issues Found
- Updated OpenTelemetry resource creation from `new Resource(...)` to `resourceFromAttributes(...)`, because current `@opentelemetry/resources` exposes `Resource` as an interface and documents factory functions for creating resources.
- Replaced `loggerProvider.addLogRecordProcessor(...)` usage with `new LoggerProvider({ processors: [...] })`, matching the current `@opentelemetry/sdk-logs` API.
- Corrected Pino timestamp handling. The JS API accepts `TimeInput` values such as epoch milliseconds; multiplying Pino's millisecond timestamp into nanoseconds would produce an incorrect time.
- Updated custom `LogRecordProcessor` examples to use `SdkLogRecord` and `setAttributes(...)`, matching the current processor interface and writable SDK log record type.
- Fixed the custom OTLP exporter error-handling example. Current exporters report export failures through the result callback and `export(...)` returns `void`, not a `Promise`.
- Updated semantic convention attribute names from older forms such as `deployment.environment`, `http.method`, `http.status_code`, `db.system`, and `db.name` to current stable names such as `deployment.environment.name`, `http.request.method`, `http.response.status_code`, `db.system.name`, and `db.namespace`.
- Added missing package installs for examples that import or target `winston-transport` and `pino-pretty`.
- Removed unused imports and made the `includeTraceContext` option in the generic bridge actually disable active context capture by emitting with `ROOT_CONTEXT`.
- Corrected the production exporter comment from "with retry logic" to "with timeout"; the snippet configured a timeout but did not implement explicit retry logic.

## Review Notes
The JavaScript Logs Bridge API package is still documented as experimental/unstable, so future OpenTelemetry JS minor releases may require additional updates. The OneUptime blog links returned HTTP 200 during review; a HEAD request to the OTLP ingestion endpoint returned 404, which is plausible for an ingestion endpoint that expects POST requests with OTLP payloads rather than browser/HEAD access.

# Validation Summary: How to Enable Diagnostic Logging in the OpenTelemetry JavaScript SDK

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry JavaScript
- `@opentelemetry/api`
- `@opentelemetry/sdk-node`
- Node.js
- OTLP HTTP trace exporter
- Environment variables

## Sources Consulted
- OpenTelemetry JavaScript Node.js getting started and troubleshooting docs: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript zero-code instrumentation troubleshooting docs: https://opentelemetry.io/docs/zero-code/js/
- OpenTelemetry JavaScript API reference for `DiagLogLevel`: https://open-telemetry.github.io/opentelemetry-js/enums/_opentelemetry_api._opentelemetry_api.DiagLogLevel.html
- OpenTelemetry JavaScript API source for `DiagConsoleLogger`: https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/diag/consoleLogger.ts
- OpenTelemetry JavaScript API source for `DiagAPI.setLogger()` and `diag.disable()`: https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/api/diag.ts
- OpenTelemetry JavaScript NodeSDK API reference: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.NodeSDK.html

## Issues Found
- The post said `DiagLogLevel` provides five levels, but the current API enum has seven level settings: `NONE`, `ERROR`, `WARN`, `INFO`, `DEBUG`, `VERBOSE`, and `ALL`. I corrected the description and clarified that a threshold includes that level and less verbose, more severe levels.
- The post described `DiagConsoleLogger` as writing only to `console.log`, `console.warn`, and `console.error`. The current implementation maps diagnostic methods to console methods including `error`, `warn`, `info`, `debug`, and `trace`, with fallback behavior. I corrected the description.
- The setup-order explanation implied exporters check endpoint reachability during SDK initialization. OTLP export failures are generally logged when export attempts happen, not simply when the `NodeSDK` is constructed. I adjusted the wording to separate SDK setup diagnostics from later export failures.
- The final code snippet used `DiagConsoleLogger` without importing it and showed `diag.setLogger(undefined, DiagLogLevel.NONE)` for disabling logging. Although the runtime handles a missing logger defensively, `diag.disable()` is the documented API for unregistering the diagnostic logger. I updated the import and disabling example.

## Review Notes
- The post's manual `OTEL_LOG_LEVEL` mapping is technically valid for code-based setup. The official zero-code auto-instrumentation module also supports `OTEL_LOG_LEVEL` and documents `info` as its default, so readers using zero-code instrumentation should account for that difference.

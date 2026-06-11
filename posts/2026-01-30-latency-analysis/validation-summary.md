# Validation Summary: How to Implement Latency Analysis

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Distributed tracing
- OpenTelemetry
- OpenTelemetry JavaScript SDK for Node.js
- TypeScript
- OTLP trace export
- Latency analysis and anomaly detection
- Mermaid diagrams

## Sources Consulted
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- @opentelemetry/resources package README and type definitions, version 2.7.1
- @opentelemetry/semantic-conventions package README and type definitions, version 1.41.1
- @opentelemetry/instrumentation-http package README and type definitions, version 0.218.0
- @opentelemetry/sdk-node package README and type definitions, version 0.218.0

## Issues Found
- The self-time explanation and code subtracted the sum of child span durations, which can be wrong when child spans overlap. Updated the definition and code to subtract the merged time covered by direct child spans.
- The critical-path description used "sum of spans" wording that can double-count parent envelope spans. Updated the wording to wall-clock time on the longest dependent path and revised the sample algorithm to avoid double-counting nested parent duration in the service breakdown.
- The operation categorization code only checked the legacy `http.method` and `http.host` attributes. Updated it to also recognize the stable `http.request.method` and `server.address` conventions while retaining compatibility with older data.
- The pipeline snippet declared `degradationAlerts` without `currentAvg` and `baselineAvg`, but used those fields later. Updated the TypeScript type to match the returned data.
- The pipeline snippet passed `TraceSpan[]` directly to `findCriticalPath`, whose interface expects `name` and `service`. Added a mapping from `operationName` and `serviceName`.
- The OpenTelemetry Node.js setup used deprecated `SemanticResourceAttributes` namespace constants and `new Resource(...)`. Updated it to use `resourceFromAttributes` with current `ATTR_*` constants.
- The HTTP instrumentation snippet manually set nonstandard `http.request.size` and `http.response.size` attributes from hooks. Updated it to use the official `headersToSpanAttributes` option for `content-length` headers.
- Removed an unused `context` import from the custom span example.

## Review Notes
The critical-path implementation remains a simplified educational example. Production critical-path analysis may need backend-specific span references, async dependency metadata, and explicit modeling of queueing or wait time beyond parent-child relationships.

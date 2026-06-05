# Validation Summary: How to Choose Between OpenTelemetry Signals: Traces vs Metrics vs Logs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry traces
- OpenTelemetry metrics
- OpenTelemetry logs
- OpenTelemetry JavaScript API and SDK
- OpenTelemetry Collector tail sampling processor
- Prometheus histogram queries
- Node.js HTTP server connection events
- Pino structured logging

## Sources Consulted
- OpenTelemetry Signals documentation: https://opentelemetry.io/docs/concepts/signals/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript sampling documentation: https://opentelemetry.io/docs/languages/js/sampling/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Metrics SDK specification, exemplars: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- Node.js HTTP server connection event documentation: https://nodejs.org/api/http.html
- Prometheus histogram practices documentation: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The post said OpenTelemetry provides three signal types. Current OpenTelemetry documentation also lists baggage and has profiles under development, so the wording was changed to describe traces, metrics, and logs as core telemetry signals.
- The active connection gauge decremented on the server `close` event, which fires when the server closes rather than when each client connection closes. The snippet now decrements on the socket `close` event for each connection.
- Span status examples used numeric status codes (`1` and `2`). The snippets now import and use `SpanStatusCode.OK` and `SpanStatusCode.ERROR`, matching the OpenTelemetry JavaScript API documentation.
- The Prometheus histogram query was incomplete. It now uses `histogram_quantile` with a `rate()` over histogram buckets and aggregation by `le`.
- The Express handler in the multi-service trace example used `await` inside a non-`async` callback. The handler is now marked `async`.
- The exemplar section implied that a bare `MeterProvider` automatically enabled usable exemplars. It now states that OpenTelemetry SDKs support exemplars, the spec recommends trace-based filtering by default, and exporter/backend support must preserve exemplars.

## Review Notes
The post is technically sound after the targeted fixes. Some examples are intentionally illustrative and omit full SDK exporter setup, dependency installation, and production concerns such as PII handling in span/log attributes.

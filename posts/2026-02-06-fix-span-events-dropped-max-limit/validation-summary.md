# Validation Summary: How to Fix Span Events Being Silently Dropped Because They Exceed the Maximum

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry span events and SDK span limits
- OpenTelemetry Python SDK
- OpenTelemetry Go SDK
- OpenTelemetry Java SDK / Java agent autoconfiguration
- OpenTelemetry Collector transform processor
- SQL-style backend querying

## Sources Consulted
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Python SDK trace API documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- OpenTelemetry Python SDK trace source documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry Go SDK trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Java SDK configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/

## Issues Found
- The post stated that once the span event limit is reached, new events are silently dropped. The OpenTelemetry specification allows SDKs to discard events beyond the configured limit, while the Go SDK documents that it adds the new event and drops the oldest event. Updated the wording to say events are not retained and that SDK behavior can differ.
- The SQL example used an aggregate alias in the `WHERE` clause and counted an `events` field directly, which is not valid portable SQL. Rewrote the example as a backend-schema-adjustable event-count query using `GROUP BY` and `HAVING`.
- The Go example used `trace.WithSpanLimits`, which is deprecated in the current Go SDK documentation. Updated it to construct limits with `trace.NewSpanLimits()`, set `EventCountLimit`, and pass them with `trace.WithRawSpanLimits()`.

## Review Notes
The Python `SpanLimits(max_events=512)` example, `OTEL_SPAN_EVENT_COUNT_LIMIT` environment variable, Java environment-variable configuration, default limit of 128 events per span, `record_exception()` creating an exception event in Python, and Collector transform-processor caveat were verified against official documentation.

# Validation Summary: How to Monitor Dramatiq Task Queues with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dramatiq
- Redis broker for Dramatiq
- OpenTelemetry Python tracing API and SDK
- OpenTelemetry OTLP trace and metric exporters
- OpenTelemetry Python metrics API and SDK
- APScheduler
- psutil

## Sources Consulted
- Dramatiq API Reference, https://dramatiq.io/reference.html
- Dramatiq User Guide, https://dramatiq.io/guide.html
- Dramatiq Redis broker source documentation, https://dramatiq.io/_modules/dramatiq/brokers/redis.html
- OpenTelemetry Python instrumentation guide, https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters guide, https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python package API checks using current PyPI packages installed temporarily under `/tmp`

## Issues Found
- The introduction said OpenTelemetry provides Dramatiq instrumentation that automatically traces task lifecycle events, but the post later correctly explains that there is no official Dramatiq instrumentation. Changed the claim to describe custom instrumentation.
- The dependency list used `psutil` later in the worker monitoring example but did not install it. Added an optional `pip install psutil` command.
- The custom middleware created the processing span with `start_span()` but did not make it current, so task-level spans created with `start_as_current_span()` would not become child spans of the Dramatiq processing span. Added OpenTelemetry context attachment and detachment around task processing.
- The middleware stored live span objects and timestamps in `message.options`, which are Dramatiq message metadata and can be serialized during retries. Changed the middleware to keep active spans in middleware-local state keyed by message ID.
- The metrics example passed a trace `OTLPSpanExporter` to `PeriodicExportingMetricReader`. Added the correct `OTLPMetricExporter` and used it for metrics export.
- The queue-depth example used a hard-coded Redis key with `LLEN`, which depends on Dramatiq Redis internals and did not match the broker's queue-size helper. Changed it to use `redis_broker.do_qsize("default")`.

## Review Notes
The Dramatiq actor, middleware hook, pipeline, retry, and dead-letter concepts align with the current Dramatiq documentation. The Python snippets were syntax-checked locally, and key imports/APIs were verified against current installed Dramatiq and OpenTelemetry packages. The examples remain illustrative and assume the surrounding setup variables such as `redis_broker`, `resource`, `tracer`, and `scheduler` are defined as shown earlier in the post.

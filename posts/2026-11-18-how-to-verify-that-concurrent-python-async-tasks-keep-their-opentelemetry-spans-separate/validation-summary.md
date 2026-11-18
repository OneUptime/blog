# Validation Summary: How to Verify OpenTelemetry Span Isolation in Concurrent Python Async Tasks

## Status

validated

## Post Type

Tutorial / regression-testing guide.

## Technologies Covered

- Python 3.11 and later
- asyncio tasks, events, and cooperative scheduling
- contextvars and task-local context
- OpenTelemetry Python tracing API and SDK
- InMemorySpanExporter, SimpleSpanProcessor, and ALWAYS_ON sampling
- Distributed trace context propagation

## Sources Consulted

- Python asyncio documentation: https://docs.python.org/3/library/asyncio-task.html
- Python 3.11 asyncio documentation, including task context inheritance and sleep scheduling: https://docs.python.org/3.11/library/asyncio-task.html
- Python contextvars documentation: https://docs.python.org/3/library/contextvars.html
- OpenTelemetry Python tracing API, including current-span scopes: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python SDK tracing documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.html
- SDK implementation of parent selection and root creation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- SimpleSpanProcessor implementation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace/export.html
- OpenTelemetry sampling documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- Official InMemorySpanExporter implementation: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-sdk/src/opentelemetry/sdk/trace/export/in_memory_span_exporter.py
- Official contextvars runtime implementation: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-api/src/opentelemetry/context/contextvars_context.py
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry tracing specification, including span naming guidance: https://opentelemetry.io/docs/specs/otel/trace/api/#span

## Issues Found

No technical issues found.

## Review Notes

- The technical content of README.md was left unchanged. The post contains a complete Python example and is technically relevant.
- Runtime verification was attempted using Python 3.15.0 and a disposable virtual environment. Environment creation stalled in ensurepip and was stopped before dependency installation or example execution. Validation therefore rests on code review and official documentation; no runtime pass is claimed. The validation JSON was parsed and checked against the requested status/date, and git diff --check reported no formatting errors for this post.
- Task creation captures the current context by default; merely constructing a coroutine does not. Context copying does not deep-copy the parent span object. The explicit task context parameter is available in Python 3.11, consistent with the stated baseline.
- An empty OpenTelemetry Context produces a root span. Each child inherits its request's current span, while start_as_current_span activates its own span and restores the previous context on exit. Obtaining a tracer directly from the local provider does not replace the global provider.
- ALWAYS_ON samples the example spans, and SimpleSpanProcessor exports them synchronously on completion. Reading the in-memory exporter after both requests complete therefore requires no batch flush or Collector.
- The event is not an all-children-ready barrier: under ordinary scheduling it can be set before child tasks reach wait(). The repeated asyncio.sleep(0) calls still force suspension and allow child spans to overlap, so the stated interleaving check remains valid.
- Assertions cover the six uniquely named spans, root parentlessness, separate root trace IDs, child trace and parent span IDs, active child spans across yields, and restoration of request and main-task contexts. Run normally with assertions enabled; Python optimization can remove assert statements.
- The example is a baseline, not a test of application-specific exception handling, cancellation, or remote boundaries. The post correctly calls for separate tests of those paths. A queued context must also be activated or passed explicitly when processing its work item.
- All links embedded in the post resolved to the intended documentation or author profile. No deprecated API usage, CLI flags, or configuration snippets requiring correction were found.
- Format validation shortened the title to meet the 80-character limit and synchronized it with Blogs.json and this review heading.

# Validation Summary: How to Debug Race Conditions in Async Applications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python API
- Python asyncio
- Python contextvars
- Distributed tracing
- Race condition debugging

## Sources Consulted
- OpenTelemetry Python context API: https://opentelemetry-python.readthedocs.io/en/latest/api/context.html
- OpenTelemetry Python trace API: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python asyncio instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/asyncio/asyncio.html
- Python asyncio task documentation: https://docs.python.org/3/library/asyncio-task.html
- Python contextvars documentation: https://docs.python.org/3/library/contextvars.html
- OpenTelemetry tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/

## Issues Found
- The post stated that OpenTelemetry context does not always propagate automatically when spawning a Python asyncio task or coroutine, then manually attached the same context inside `asyncio.gather()` children. Modern Python asyncio Tasks copy `contextvars` automatically, which is how OpenTelemetry Python carries current context. I updated the explanation and example so `asyncio.gather()` relies on automatic task context copying, while still noting that manual capture and reattachment can be needed for boundaries such as thread executors or custom callback schedulers.
- The overlap-analysis example called `find_overlapping_spans(trace, ...)`, but `trace` is the imported OpenTelemetry module in the earlier code, not trace data. I changed the example call to `find_overlapping_spans(trace_data, ...)`.
- The span-link example used `current_holder.span_context`. The documented OpenTelemetry Python span API exposes `get_span_context()`, so I changed the example to `current_holder.get_span_context()`.
- The ordering-breadcrumbs section said a race would show "two traces" reading the same resource version, but the same issue can be visible as two spans within one trace or as two separate traces. I changed this to "two spans or traces" for accuracy.

## Review Notes
The span-overlap function assumes exported span timestamps are numeric nanosecond values, as in OTLP-style data. Some tracing backends expose timestamps as ISO strings or another query-specific format, so readers may need to adapt parsing for their backend.

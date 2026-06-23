# Validation Summary: How to Implement Distributed Tracing in Python Microservices

## Status
validated

## Post Type
Tutorial / Guide (hands-on implementation walkthrough)

## Technologies Covered
- Python
- OpenTelemetry (SDK, OTLP HTTP exporter, propagators)
- W3C Trace Context and B3 propagation
- Distributed tracing / context propagation
- HTTP clients: `requests`, `httpx` (async)
- Web frameworks: Flask, FastAPI (Starlette middleware)
- gRPC (server + client, metadata propagation)
- Celery (task context propagation)
- Message queues: Redis Pub/Sub, RabbitMQ (Pika)

## Sources Consulted
- OpenTelemetry Python API/SDK docs — https://opentelemetry.io/docs/languages/python/
- OpenTelemetry Python propagation (`inject`/`extract`, `set_global_textmap`) — https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OTLP HTTP span exporter — `opentelemetry.exporter.otlp.proto.http.trace_exporter.OTLPSpanExporter`
- B3 propagator (`opentelemetry-propagator-b3`, `B3MultiFormat`) — https://opentelemetry-python-contrib.readthedocs.io/
- Composite propagator & W3C `TraceContextTextMapPropagator`
- Celery bound-task / `Task.request` semantics — https://docs.celeryq.dev/en/stable/userguide/tasks.html
- gRPC Python metadata semantics — https://grpc.io/docs/languages/python/
- Verified locally that the documented OpenTelemetry import paths and symbols resolve (OTLPSpanExporter, CompositePropagator, TraceContextTextMapPropagator, Resource, `trace.Status`/`StatusCode`/`SpanKind`). `opentelemetry.propagators.b3.B3MultiFormat` is the correct documented path; it lives in the optional `opentelemetry-propagator-b3` package.

## Issues Found
- **Celery `traced_task` decorator referenced `wrapper.request` (runtime `AttributeError`).** With `@app.task(bind=True)`, Celery passes the task instance — which holds `.request` (headers, id, delivery_info) — as the first positional argument; the request is *not* an attribute of the wrapper function object. The original code accessed `wrapper.request.headers`, `wrapper.request.id`, and `wrapper.request.delivery_info`, all of which would raise at runtime. Fixed by capturing `task_instance = args[0]` at the top of the wrapper and reading `task_instance.request.*` instead. The downstream `func(*args, **kwargs)` call is unchanged and still passes `self` through correctly to the bound task body.

## Review Notes
- The `wrapper.bind = func` line (with the comment "Preserve the request attribute for Celery") is dead code — binding is provided by `@app.task(bind=True)`, not by this attribute. It is harmless (does not affect execution), so it was left in place to avoid unnecessary edits.
- In the API Gateway example, `return {"error": "User not found"}, 404` and `return order_response.json()` use a Flask-style `(body, status)` tuple return inside a FastAPI handler. FastAPI does not interpret the second tuple element as a status code (it would serialize the tuple as a JSON array); a `JSONResponse(..., status_code=404)` or raising `HTTPException` would be the correct form. This is peripheral to the tracing topic the post teaches and was left as-is to avoid restructuring the example.
- `rpc.status_code` is used as a custom span attribute on the gRPC client. The current OpenTelemetry semantic convention for gRPC is `rpc.grpc.status_code` (an integer status code). This is a convention nuance, not a correctness bug, and does not affect trace propagation.
- The custom manual Celery propagation pattern (storing W3C/B3 carrier JSON under a `trace_context` header) is a valid approach for a tutorial. In production, `opentelemetry-instrumentation-celery` automates this. Not changed.
- All core propagation mechanics (CompositePropagator with W3C + B3, `inject()` into headers/metadata/message envelopes, `extract()` on the consumer side, SpanKind CLIENT/SERVER/PRODUCER/CONSUMER usage) are correct and consistent with OpenTelemetry guidance.

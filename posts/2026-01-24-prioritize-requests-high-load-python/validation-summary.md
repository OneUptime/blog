# Validation Summary: How to Prioritize Requests in High-Load Python Services

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Python
- asyncio
- heapq priority queues
- FastAPI
- Starlette middleware and request headers
- HTTP backpressure responses
- Admission control and load shedding

## Sources Consulted
- Python `heapq` documentation: https://docs.python.org/3/library/heapq.html
- Python `asyncio` event loop and Future documentation: https://docs.python.org/3/library/asyncio-eventloop.html
- Python `asyncio` synchronization primitives documentation: https://docs.python.org/3/library/asyncio-sync.html
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html
- FastAPI lifespan events documentation: https://fastapi.tiangolo.com/advanced/events/
- Starlette request documentation: https://starlette.dev/requests/
- RFC 9110 HTTP Semantics: https://datatracker.ietf.org/doc/html/rfc9110

## Issues Found
- The priority queue could exceed `max_size` for high-priority and critical submissions when no low-priority request was available to evict. Updated the capacity logic to evict any lower-priority queued request and reject the incoming request when no lower-priority request exists.
- The queue used `datetime.utcnow().timestamp()` for FIFO ordering. `datetime.utcnow()` is deprecated as of Python 3.12, so the timestamp was changed to `time.monotonic()`, which is also better suited for ordering elapsed events.
- Worker tasks were created but not retained or awaited on shutdown, despite the snippet describing graceful shutdown. Added task tracking and `asyncio.gather(..., return_exceptions=True)` during `stop()`.
- Future completion did not check whether the Future had already been completed, which could raise `InvalidStateError` after cancellation or eviction. Added `future.done()` guards before setting results or exceptions.
- The FastAPI middleware converted `request.headers` to a plain dict and then checked mixed-case header names. Starlette's `Headers` object is case-insensitive, but a plain dict is not. Updated the code to use `request.headers` directly and lower-case header names.
- The middleware snippet used `@app.on_event("startup")` and `@app.on_event("shutdown")`, which FastAPI now documents as deprecated alternatives to lifespan handlers. Replaced them with an `asynccontextmanager` lifespan.
- The middleware caught only immediate `QueueFullError`; queued requests can also be evicted later and surface `RequestEvictedError` while awaiting the Future. Updated the exception handling to return 503 for both cases.
- The complete service initialized and started the priority queue but did not submit endpoint work to it, so execution was not actually priority-ordered. Updated the example endpoints to submit non-critical work to the queue and keep critical payment processing on the immediate path.

## Review Notes
- The admission controller intentionally leaves `queue_depth` and `cpu_usage` as placeholders. That is acceptable for an illustrative blog post, but a production implementation should wire those fields to real queue and system metrics.
- The snippets are syntactically valid Python after review. A local behavior check confirmed the queue now evicts lower-priority work instead of exceeding capacity.

# Validation Summary: How to Build a FastAPI Real-Time Dashboard with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Pub/Sub, key-value storage)
- FastAPI (StreamingResponse, startup events)
- Python (asyncio, redis.asyncio)
- Server-Sent Events (SSE)
- JavaScript (EventSource API)

## Sources Consulted
- redis-py official documentation: https://redis.readthedocs.io/en/stable/examples/asyncio_examples.html
- aioredis deprecation notice and migration to redis-py: https://github.com/aio-libs/aioredis-py
- FastAPI documentation on StreamingResponse: https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse
- FastAPI lifespan events documentation: https://fastapi.tiangolo.com/advanced/events/
- MDN EventSource API: https://developer.mozilla.org/en-US/docs/Web/API/EventSource
- SSE specification: https://html.spec.whatwg.org/multipage/server-sent-events.html

## Issues Found

1. **Deprecated `aioredis` package**: The post used `pip install aioredis` and `import aioredis`. The standalone `aioredis` package has been deprecated since it was merged into `redis-py` (v4.2+). Changed install command to `pip install redis` and all imports to `import redis.asyncio as aioredis` so the rest of the code continues to work without further changes.

2. **`publish_and_store()` defined but never called**: The "Store Latest State in Redis" section defined `publish_and_store()` which both publishes metrics and stores the latest snapshot, but the `@app.on_event("startup")` handler called `publish_metrics()` instead. Changed the startup task to call `publish_and_store()` so the stored-state feature actually works. Also moved the startup handler after the function definition for correct code ordering, and added the `redis.asyncio` import to that snippet for self-containedness.

## Review Notes
- `@app.on_event("startup")` is deprecated in recent FastAPI versions in favor of the `lifespan` context manager. It still functions correctly and is not removed, so this was left as-is to avoid a larger rewrite, but readers building new projects should prefer the lifespan pattern.
- The HTML template references `/static/dashboard.js` but no `StaticFiles` mount is shown. This is an implied setup detail rather than an error, but readers may need to add `app.mount("/static", StaticFiles(directory="static"), name="static")` for the page to load the script.
- Using `StreamingResponse` for SSE works but lacks automatic keep-alive and retry headers. For production use, the `sse-starlette` package (`EventSourceResponse`) provides a more robust SSE implementation.

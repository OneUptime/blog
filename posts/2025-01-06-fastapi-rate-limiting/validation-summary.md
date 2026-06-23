# Validation Summary: How to Implement Rate Limiting in FastAPI Without External Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python 3
- FastAPI
- Starlette (middleware, responses)
- psutil (adaptive limiting example)
- Python `multiprocessing.Manager` (shared-memory limiting example)
- Rate limiting algorithms: fixed window, sliding window (log + counter), token bucket, leaky bucket (table only)

## Sources Consulted
- FastAPI – Handling Errors: https://fastapi.tiangolo.com/tutorial/handling-errors/
- Starlette – Middleware (onion model, ExceptionMiddleware ordering): https://www.starlette.io/middleware/
- FastAPI issue #1125 – "Only 500 response being received from middleware": https://github.com/fastapi/fastapi/issues/1125
- FastAPI discussion #11857 – exceptions raised from middleware not returned correctly: https://github.com/fastapi/fastapi/discussions/11857
- FastAPI discussion #10404 – how to handle errors in middleware: https://github.com/fastapi/fastapi/discussions/10404
- Python docs – `functools.wraps` / `inspect.signature` following `__wrapped__`, `multiprocessing.Manager`, `enum.IntEnum`

## Issues Found
1. **Raising `HTTPException` inside `@app.middleware("http")` (Fixed Window example).** The `rate_limit_middleware` function raised an `HTTPException(status_code=429, ...)` when the limit was exceeded. In FastAPI/Starlette, custom HTTP middleware runs *outside* `ExceptionMiddleware` (the onion model), so an `HTTPException` raised there is never converted to the intended response — it propagates to `ServerErrorMiddleware` and surfaces as a **500 Internal Server Error** rather than a 429. This is a well-documented gotcha (FastAPI issues #1125 / #11857).
   - **Fix:** Replaced the `raise HTTPException(...)` with `return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"}, headers={...})`, updated the imports (`from fastapi.responses import JSONResponse`, dropped the now-unused `HTTPException` import in that snippet), and added a short comment explaining why a response must be returned rather than raised. This makes the first example consistent with the later `RateLimitMiddleware` example (which already correctly returns a `Response`).

## Review Notes
- The other `HTTPException` usages are correct: the per-route decorator (`per_route_limiting.py`) and the dependency-based examples (`user_rate_limiting.py`, priority example) raise `HTTPException` from within route handlers / dependencies, which *is* inside the routing layer where FastAPI's exception handlers apply.
- The per-route decorator relies on `functools.wraps` setting `__wrapped__`, so FastAPI introspects the original function's signature (`request: Request`). It works here because both the wrapper and wrapped functions accept `request: Request`; readers adding other path/query params to a decorated route should be aware the decorator only forwards what FastAPI resolves from the original signature.
- The in-memory limiters are not thread/async-safe (no locking around read-modify-write of counters), and per-process state is not shared across multiple Uvicorn/Gunicorn workers — the post acknowledges this and provides the `SharedMemoryLimiter` (`multiprocessing.Manager`) example for multi-worker setups. These are reasonable, accurate caveats rather than errors.
- The sliding-window-counter weighted-estimate formula `previous * (1 - weight) + current` is the standard approximation and is correct.
- `from typing import List` (sliding_window.py) and some `Optional`/`Callable` imports are unused in their snippets — harmless and left as-is since they are not technical errors.
- `request.client.host` can be `None` behind certain ASGI servers/proxies; for production behind a proxy, keys should typically derive from `X-Forwarded-For`. Not incorrect for the tutorial's scope.

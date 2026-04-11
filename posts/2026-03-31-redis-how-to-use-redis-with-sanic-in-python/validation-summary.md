# Validation Summary: How to Use Redis with Sanic in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Sanic (async web framework)
- Redis (via redis-py / `redis.asyncio`)
- redis.asyncio (`redis` PyPI package)

## Sources Consulted
- Sanic official documentation — https://sanic.dev/en/guide/basics/listeners.html (lifecycle hooks)
- Sanic cookie guide — https://sanic.dev/en/guide/basics/cookies.html (cookie API changes)
- Sanic v23.3 release notes — https://sanic.dev/en/release-notes/2023/v23.3.html (cookie deprecation)
- Sanic routing guide — https://sanic.dev/en/guide/basics/routing.html
- Sanic middleware guide — https://sanic.dev/en/guide/basics/middleware.html
- redis-py source code and documentation (v5.x+/7.x) — https://redis.readthedocs.io/en/stable/
- Redis INCR/EXPIRE command reference — https://redis.io/commands/incr

## Issues Found

1. **Deprecated cookie API (fixed):** The post used the old dict-style cookie API (`response.cookies["session_id"] = value` and `response.cookies["session_id"]["httponly"] = True`), which was deprecated in Sanic v23.3 and removed in v24.3. Replaced with the current `response.add_cookie("session_id", session_id, httponly=True)` API.

2. **Incorrect rate limiter description (fixed):** The rate limiter section described the pattern as a "sliding window" rate limiter, but INCR + EXPIRE implements a fixed window strategy. Changed "sliding window" to "fixed window."

## Review Notes
- The lifecycle hook callbacks use the legacy `(app, loop)` two-argument signature. Since Sanic v22.3, the recommended signature is `(app)` only. The two-argument form still works for backward compatibility, so this is not a bug, but it is a dated pattern.
- `request.ip` is used for rate limiting, which returns the raw peer socket IP. In production behind a reverse proxy, `request.client_ip` would be more appropriate as it respects forwarded headers. This is a deployment consideration rather than a code error.
- The `@app.middleware("request")` syntax is valid but the newer shorthand `@app.on_request` is preferred in current Sanic documentation.
- All redis-py API usage (`from_url`, `get`, `setex`, `incr`, `expire`, `aclose`) is correct and current.

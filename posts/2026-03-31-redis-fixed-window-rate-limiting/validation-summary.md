# Validation Summary: How to Implement Fixed Window Rate Limiting with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (INCR, EXPIRE, TTL, pipelines with MULTI/EXEC)
- Python (redis-py client library)
- Flask (before_request/after_request middleware, request context `g`)
- HTTP rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)

## Sources Consulted
- Redis INCR command documentation: https://redis.io/commands/incr
- Redis EXPIRE command documentation: https://redis.io/commands/expire
- Redis TTL command documentation: https://redis.io/commands/ttl
- redis-py pipeline documentation: https://redis-py.readthedocs.io/en/stable/advanced_features.html#pipelines
- Flask request hooks documentation: https://flask.palletsprojects.com/en/latest/api/#flask.Flask.before_request
- RFC 6585 (429 Too Many Requests): https://www.rfc-editor.org/rfc/rfc6585#section-4
- IETF RateLimit header fields draft: https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/

## Issues Found
1. **Incorrect `reset_at` calculation in `check_rate_limit` function**: The function called `pipe.ttl(key)` after `pipe.expire(key, window_seconds)` within the same atomic pipeline. Because EXPIRE resets the TTL to `window_seconds` immediately before TTL is read, the TTL always returned approximately `window_seconds` regardless of the actual position within the current window. This caused `reset_at = int(time.time()) + ttl` to always report a reset time ~`window_seconds` in the future, which could be significantly later than the real window boundary. For example, with a 60-second window at 45 seconds into the window, the code would report reset in 60 seconds instead of 15 seconds. **Fix:** Removed the unnecessary `pipe.ttl(key)` call and computed `reset_at` directly as `(window + 1) * window_seconds`, which gives the exact Unix timestamp of the next window boundary.

## Review Notes
- The `pipe.expire(key, window_seconds)` call runs on every request rather than only on the first request (when INCR returns 1). This resets the TTL each time, causing keys to persist slightly longer than necessary. However, since keys are namespaced by window number, this does not affect rate limiting correctness — it is only a minor memory efficiency concern. The post's step 3 ("Set TTL to the window size on the first request") describes the ideal behavior but the code applies EXPIRE unconditionally. This is a common pattern in production and not considered a bug.
- The claim "The atomic pipeline ensures no race conditions" is accurate for this use case since Redis INCR is atomic and the pipeline uses MULTI/EXEC by default in redis-py.
- The boundary burst explanation and diagram are correct and clearly presented.
- The bash commands for checking counter state correctly mirror the Python key generation logic.

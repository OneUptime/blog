# Validation Summary: How to Implement Per-Endpoint Rate Limiting with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (key-value store, pipelines, hash commands, TTL, SCAN)
- Python (redis-py client library)
- Flask (before_request/after_request middleware, request context, g object)

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/ — verified `Redis()`, `pipeline()`, `incr()`, `expire()`, `ttl()`, `hset(mapping=...)`, `hgetall()` APIs
- Flask official documentation: https://flask.palletsprojects.com/ — verified `before_request`, `after_request`, `g`, `request.remote_addr`, `request.method`, `request.path`, `jsonify` usage
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/ — verified `--scan` and `--pattern` flags
- IETF RateLimit header fields draft: https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/ — referenced for X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset semantics

## Issues Found
1. **Bug in `X-RateLimit-Limit` header computation and missing `limit` in return dict**: The `check_rate_limit` function did not include the configured `limit` value in its return dictionary. The `set_rate_limit_headers` function computed `X-RateLimit-Limit` as `r_info.get('count', 0) + r_info.get('remaining', 0)`. This is incorrect when the request count exceeds the limit — for example, with limit=100 and count=105, `remaining` is `max(0, 100-105) = 0`, so the header would report 105 instead of 100. **Fix**: Added `"limit": limit` to the `check_rate_limit` return dict and changed the header to use `r_info.get('limit', 0)` directly.

## Review Notes
- The fixed-window rate limiting approach used here is simple and effective but can allow up to 2x the limit at window boundaries (e.g., a burst at the end of one window and start of the next). The post doesn't claim sliding window behavior, so this is correct as presented, but readers implementing strict rate limiting should be aware of this characteristic.
- The `EXPIRE` command is called on every request within the same window, which resets the TTL each time. This is harmless (just extends the cleanup buffer) but is slightly redundant after the first request in a window. A minor optimization would be to only set expiry when count equals 1, but the current approach is functionally correct.
- The dynamic limits section (`set_dynamic_limit`/`get_dynamic_limit`) is defined but never integrated into the middleware's `get_endpoint_config` function. This is acceptable for a tutorial showing building blocks, but readers should note they'd need to check dynamic limits before falling back to the static config.

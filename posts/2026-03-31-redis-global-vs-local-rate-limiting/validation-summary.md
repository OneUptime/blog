# Validation Summary: How to Implement Global vs Local Rate Limiting with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Redis (redis-py client library)
- Redis CLI
- Distributed systems rate limiting patterns (fixed-window counter)

## Sources Consulted
- redis-py official documentation (https://redis-py.readthedocs.io/) — verified `Redis`, `ConnectionPool`, `Pipeline` APIs, parameter names (`decode_responses`, `max_connections`, `socket_connect_timeout`, `socket_timeout`), and return types (`INCR` returns post-increment integer)
- Redis official command reference (https://redis.io/commands/) — verified `INCR`, `EXPIRE`, `GET` command behavior and atomicity guarantees
- Python standard library docs — verified `time.time()`, `collections.defaultdict` usage

## Issues Found
No technical issues found.

## Review Notes
- The `pipeline()` call defaults to `transaction=True` (MULTI/EXEC), which is appropriate for ensuring INCR+EXPIRE atomicity. The post doesn't explicitly mention this but the code is correct as-is.
- The `EXPIRE` is called on every request, which resets the TTL each time. A minor optimization would be to only set EXPIRE when INCR returns 1 (key was just created), but the current approach is functionally correct and is a common pattern.
- The hybrid approach's local counter increments even for requests that will later be rejected by the global check. This is expected behavior for a pre-filter and does not affect correctness.
- The bash monitoring command correctly mirrors the Python window calculation for the default 60-second window.

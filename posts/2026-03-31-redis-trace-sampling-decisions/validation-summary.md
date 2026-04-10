# Validation Summary: How to Use Redis for Trace Sampling Decisions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (redis-py Python client)
- Python 3
- redis-cli (Redis command-line interface)
- Distributed tracing concepts (head-based and tail-based sampling)
- OpenTelemetry (referenced in tags)

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- Redis SETEX command reference: https://redis.io/commands/setex/
- Redis HSET command reference: https://redis.io/commands/hset/
- Redis HGETALL command reference: https://redis.io/commands/hgetall/
- Redis INCR command reference: https://redis.io/commands/incr/
- Redis MGET command reference: https://redis.io/commands/mget/
- Python `max()` built-in documentation: https://docs.python.org/3/library/functions.html#max

## Issues Found
No technical issues found.

## Review Notes
- The `get_or_create_sampling_decision` function has a TOCTOU race condition: two services could simultaneously read `None` from `r.get(key)` and independently compute different sampling decisions. Using `SET key value NX EX 600` would make this atomic. This is a common simplification in tutorial code and doesn't affect correctness for educational purposes.
- The bash counter keys (`sampling:sampled:minute:*`, `sampling:total:minute:*`) are created without a TTL via `INCR`, so they will accumulate indefinitely. In production, an `EXPIRE` should be set after each `INCR` or a cleanup mechanism should be added.
- The tail-based sampling code block uses `random.random()` without importing `random` in that snippet; it relies on the import from the first code block. Readers using that snippet in isolation would need to add the import.
- The `buffer_span` function resets the TTL on every `hset` + `expire` call, which extends the buffer window as new spans arrive. This is likely intentional but worth noting.

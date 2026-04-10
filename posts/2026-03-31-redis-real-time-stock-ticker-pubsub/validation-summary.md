# Validation Summary: How to Build a Real-Time Stock Ticker with Redis Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Pub/Sub (`PUBLISH`, `SUBSCRIBE`, `PSUBSCRIBE`)
- Redis Hashes (`HSET`, `HGET`) for last-price caching
- Redis `SET` with `NX` and `PX` flags for throttling
- Redis Pipelines for batched reads
- Python `redis-py` client library
- WebSockets (conceptual, no specific library)

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- Redis Pub/Sub documentation: https://redis.io/docs/latest/develop/interact/pubsub/
- Redis SET command documentation (NX/PX flags): https://redis.io/docs/latest/commands/set/
- Redis HSET/HGET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis PSUBSCRIBE command documentation: https://redis.io/docs/latest/commands/psubscribe/
- Python `json` module documentation: https://docs.python.org/3/library/json.html

## Issues Found
1. **Variable shadowing in `watchlist_snapshot` dict comprehension** (line 111): The loop variable `r` in `{s: json.loads(r) for s, r in zip(symbols, results) if r}` shadowed the module-level Redis client `r = redis.Redis()`. While Python scoping rules make this technically functional, it is a naming collision that would confuse readers and could cause bugs if the comprehension were extended to also reference the Redis client. Changed the loop variable from `r` to `raw` for clarity: `{s: json.loads(raw) for s, raw in zip(symbols, results) if raw}`.

## Review Notes
- All Redis commands (`PUBLISH`, `SUBSCRIBE`, `PSUBSCRIBE`, `HSET`, `HGET`, `SET` with NX/PX) are used correctly and match current Redis and redis-py APIs.
- The throttling pattern using `SET key value PX ms NX` is a well-established Redis idiom for rate limiting.
- The `pubsub.listen()` message type checks (`"message"` for `SUBSCRIBE`, `"pmessage"` for `PSUBSCRIBE`) are correct per redis-py documentation.
- The `message["data"]` field from `pubsub.listen()` returns bytes in redis-py; the callback receives raw bytes, which is a valid design choice (decoding is left to the consumer).
- The post correctly notes that Pub/Sub is fire-and-forget with no message persistence, which is appropriate context for a stock ticker use case where only the latest price matters.
- The architecture described (per-symbol channels, last-price caching, horizontal gateway scaling) is a sound and commonly used pattern for real-time financial data distribution.

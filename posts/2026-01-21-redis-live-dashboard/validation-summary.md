# Validation Summary: How to Build a Live Dashboard with Redis

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Redis data structures: hashes, sorted sets, streams, Pub/Sub, sets, string keys
- redis-py synchronous and asyncio clients
- FastAPI WebSockets
- Node.js with ioredis and ws
- Browser WebSocket API
- Chart.js
- Python schedule library

## Sources Consulted
- Redis command documentation: https://redis.io/docs/latest/commands/
- Redis ZADD documentation: https://redis.io/docs/latest/commands/zadd/
- Redis XADD documentation: https://redis.io/docs/latest/commands/xadd/
- Redis Streams documentation: https://redis.io/docs/latest/develop/data-types/streams/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- FastAPI WebSockets documentation: https://fastapi.tiangolo.com/advanced/websockets/
- Starlette WebSockets documentation: https://starlette.dev/websockets/
- Chart.js update documentation: https://www.chartjs.org/docs/latest/developers/updates.html
- ioredis Pub/Sub documentation: https://github.com/redis/ioredis
- ws package documentation: https://www.npmjs.com/package/ws
- Browser WebSocket API documentation: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- schedule documentation: https://schedule.readthedocs.io/

## Issues Found
- The counter example incremented `metrics:counters:*` and published updates, but it did not update the `metrics:current:*` hash used by the initial dashboard loading examples. Updated `increment_counter` to write the current counter value, timestamp, and labels to the matching current metric hash before publishing.
- The FastAPI broadcast loop iterated directly over a mutable set of WebSocket connections while awaiting sends. Updated it to iterate over a list snapshot so disconnect cleanup cannot mutate the set during iteration.
- The `schedule` example registered a minute job but did not call `schedule.run_pending()`, so the background job would never run. Added the standard scheduler loop with `time.sleep(1)`.

## Review Notes
- Python code blocks were parsed with `ast.parse` after the edits; all Python snippets are syntactically valid.
- JavaScript code blocks were checked with `node --check`; both JavaScript snippets are syntactically valid.
- The sorted-set time-series approach is valid for an introductory tutorial, but RedisTimeSeries or another purpose-built time-series store would usually be more ergonomic for high-cardinality, high-volume production metrics.
- The example uses `KEYS` to discover time-series keys in a background job. This is functionally correct, but `SCAN` is preferable for large production Redis deployments.

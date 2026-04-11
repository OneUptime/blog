# Validation Summary: How to Use DISCARD in Redis to Cancel a Transaction

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (DISCARD, MULTI, EXEC, WATCH, UNWATCH commands)
- Python (redis-py client library)
- Node.js (node-redis v4 client library)

## Sources Consulted
- Redis official documentation for DISCARD: https://redis.io/docs/latest/commands/discard/
- Redis official documentation for EXEC: https://redis.io/docs/latest/commands/exec/
- Redis official documentation for UNWATCH: https://redis.io/docs/latest/commands/unwatch/
- redis-py Pipeline source code (reset() method behavior)
- node-redis v4 Multi command source code (available methods on multi object)

## Issues Found

1. **Python example: Incorrect comment about `pipe.reset()`** — The comment said "This calls DISCARD internally" but at that point in the code, `pipe.multi()` has not been called yet. The pipeline is in watch mode, not MULTI mode. `pipe.reset()` sends UNWATCH to release the watched keys, not DISCARD. Fixed the comment to: "This calls UNWATCH internally to release the watch."

2. **Node.js example: Non-existent `multi.discard()` method** — In node-redis v4, `client.multi()` returns a local command buffer. MULTI is not sent to the server until `.exec()` is called. The Multi object does not have a `.discard()` method. Calling `multi.discard()` would throw a TypeError. Additionally, the original code mixed CommonJS `require()` with top-level `await`, which is invalid in standard Node.js. Rewrote the example to use `client.sendCommand()` to explicitly send MULTI, SET, and DISCARD commands at the protocol level, wrapped in an async function to avoid the top-level await issue.

## Review Notes
- The Python example uses `pipe.reset()` before `pipe.multi()` is called. While functionally correct (it releases the WATCH and resets the pipeline), it does not actually demonstrate DISCARD at the Redis protocol level. This is acceptable since the example's purpose is showing the idiomatic redis-py pattern for aborting a transactional workflow.
- The EXEC error handling section's example assumes the key `not:a:number` already holds a non-numeric string value. If the key does not exist, INCR would succeed (treating the value as 0). This is implied by the key name but could be made more explicit. Left as-is since the convention is clear enough in tutorial context.
- All Redis command behavior (DISCARD returns OK, DISCARD outside MULTI returns error, DISCARD releases WATCH, partial execution on runtime errors during EXEC) verified against official documentation.

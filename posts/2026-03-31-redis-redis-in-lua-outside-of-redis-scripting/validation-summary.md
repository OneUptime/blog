# Validation Summary: How to Use Redis in Lua (Outside of Redis Scripting)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Lua (5.1+)
- redis-lua client library (LuaRocks package)
- LuaRocks package manager

## Sources Consulted
- redis-lua GitHub repository (https://github.com/nrk/redis-lua) — source code, examples, and test suite
- redis-lua LuaRocks page
- redis-lua source code: `src/redis.lua` — command definitions, response handlers (`toboolean` for `exists`, `zset_range_reply` for sorted set ranges)
- redis-lua test suite: `test/test_client.lua` — verified return types and API signatures
- redis-lua examples: `examples/pubsub.lua` — verified Pub/Sub API

## Issues Found

### 1. `client:exists()` returns boolean, not integer (Medium)
**What was wrong:** The post checked `client:exists("session:abc") == 1`. The redis-lua library defines `exists` with a `toboolean` response handler, so it returns `true`/`false`, not `1`/`0`. The `== 1` comparison would always be false.
**What was changed:** Changed to `client:exists("session:abc")` (truthy check).

### 2. `zrevrange` with WITHSCORES — wrong return format and iteration (High)
**What was wrong:** The post passed `"WITHSCORES"` as a string argument and iterated the result as a flat array with `for i = 1, #top, 2`. The redis-lua library's `zset_range_reply` handler transforms the response into an array of `{member, score}` pairs (e.g., `{{"alice", "100"}, {"carol", "90"}}`), not a flat array. The iteration pattern would fail.
**What was changed:** Changed the options argument to `{ withscores = true }` (idiomatic form) and the loop to `for _, entry in ipairs(top) do ... entry[1] ... entry[2]`.

### 3. Pub/Sub API is completely wrong (Critical)
**What was wrong:** The post used `subscriber:subscribe("alerts", function(msg) ... end)` with a callback pattern and `return false` to stop. This API does not exist in redis-lua. The library uses `client:pubsub()` which accepts a table like `{ subscribe = { "channel1" } }` and returns a coroutine-based iterator yielding `(msg, abort)` pairs for use in a `for` loop.
**What was changed:** Replaced the entire Pub/Sub subscriber block with the correct `for msg, abort in subscriber:pubsub({ subscribe = { "alerts" } }) do` pattern, checking `msg.kind == "message"` and calling `abort()` to stop.

## Review Notes
- The uppercase `"WITHSCORES"` string would technically work since the library lowercases it internally, but `{ withscores = true }` is the idiomatic and documented form used in examples and tests.
- The pipeline section is correct. `client:pipeline()` returns the replies table, and `#pipeline` gives the count of replies, which matches the number of commands for simple SET operations.
- The `hmset` usage with a table argument is correct — the library has a `hash_multi_request_builder` that expands table key-value pairs.
- The `hgetall` response handler correctly converts the flat Redis reply into a Lua associative table, so iterating with `pairs()` is valid.

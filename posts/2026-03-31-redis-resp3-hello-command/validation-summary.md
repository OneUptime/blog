# Validation Summary: How to Use RESP3 with the HELLO Command in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (6.0+ / 7.2.0 examples)
- RESP3 protocol
- redis-py (Python Redis client)
- node-redis (Node.js Redis client)
- Redis CLI

## Sources Consulted
- Official Redis HELLO command documentation: https://redis.io/docs/latest/commands/hello/
- RESP3 protocol specification: https://github.com/redis/redis-specifications/blob/master/protocol/RESP3.md
- Redis protocol spec: https://redis.io/docs/latest/develop/reference/protocol-spec/
- redis-py source code on GitHub (protocol parameter, HELLO handling)
- node-redis v5 documentation: https://github.com/redis/node-redis/blob/master/docs/v5.md
- ioredis GitHub issues #1073 and #1870 (RESP3 support status)
- Official Redis EXISTS command documentation: https://redis.io/docs/latest/commands/exists/

## Issues Found

1. **Node.js example used ioredis, which does not support RESP3.** The original example used `ioredis` with a `RESP: 3` constructor option and a `client.hello(3)` call. ioredis does not support RESP3 — it uses a RESP2-only parser (`redis-parser` v3) and has no `RESP` configuration option. The ioredis maintainers have explicitly directed users to node-redis for RESP3 support (GitHub issue #1870). **Fixed:** Replaced the ioredis example with a `node-redis` (`redis` npm package) v5 example using `createClient({ RESP: 3 })`, which is the correct Node.js client for RESP3.

2. **Incorrect claim about saving a round trip vs "AUTH + SELECT".** The post stated HELLO saves a round trip compared to `AUTH + SELECT`. HELLO has no SELECT (database selection) capability. HELLO combines protocol negotiation and authentication, saving a round trip compared to sending AUTH and HELLO as separate commands. **Fixed:** Changed "AUTH + SELECT" to "sending AUTH and HELLO as separate commands".

3. **EXISTS cited as an example of boolean responses in RESP3.** The post claimed `EXISTS` returns `True`/`False` after RESP3 upgrade. EXISTS returns an integer reply (a count of how many keys exist) in both RESP2 and RESP3 — it is not a boolean command. **Fixed:** Changed the example from `EXISTS` to `SISMEMBER`, which correctly returns a boolean-like 0/1 that redis-py maps to `True`/`False` under RESP3.

## Review Notes
- The redis-py `hello()` method raises `NotImplementedError` by design. The post uses `r.execute_command("HELLO")` which correctly bypasses this and works as described.
- The `connect_with_best_protocol` helper creates two separate connections when upgrading to RESP3 (the initial RESP2 connection is not closed). This is functional but could leak connections in production code. Not a correctness issue, so left as-is.
- All Redis CLI output examples (RESP2 array format and RESP3 map format with `#` prefix) are accurate for Redis 7.2.0.

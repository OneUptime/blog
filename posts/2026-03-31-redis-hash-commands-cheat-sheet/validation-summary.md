# Validation Summary: Redis Hash Commands Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- Redis (core hash data structure commands)
- Redis 7.4+ field-level TTL commands (HEXPIRE, HTTL, HPTTL, HPERSIST)
- Redis 8.0+ atomic hash field operations (HGETDEL, HGETEX, HSETEX)

## Sources Consulted
- https://redis.io/docs/latest/commands/hset/
- https://redis.io/docs/latest/commands/hget/
- https://redis.io/docs/latest/commands/hmget/
- https://redis.io/docs/latest/commands/hgetall/
- https://redis.io/docs/latest/commands/hsetnx/
- https://redis.io/docs/latest/commands/hexists/
- https://redis.io/docs/latest/commands/hdel/
- https://redis.io/docs/latest/commands/hlen/
- https://redis.io/docs/latest/commands/hincrby/
- https://redis.io/docs/latest/commands/hincrbyfloat/
- https://redis.io/docs/latest/commands/hkeys/
- https://redis.io/docs/latest/commands/hvals/
- https://redis.io/docs/latest/commands/hrandfield/
- https://redis.io/docs/latest/commands/hscan/
- https://redis.io/docs/latest/commands/hexpire/
- https://redis.io/docs/latest/commands/httl/
- https://redis.io/docs/latest/commands/hpttl/
- https://redis.io/docs/latest/commands/hpersist/
- https://redis.io/docs/latest/commands/hgetdel/
- https://redis.io/docs/latest/commands/hgetex/
- https://redis.io/docs/latest/commands/hsetex/

## Issues Found
1. **HSETEX syntax was incorrect**: The post showed `HSETEX user:42 60 FIELDS 1 session_token "abc123"` but the correct syntax requires the `EX` keyword before the seconds value: `HSETEX user:42 EX 60 FIELDS 1 session_token "abc123"`. Fixed in the code example.

2. **Incorrect version attribution for HGETDEL, HGETEX, and HSETEX**: These three commands were grouped under the "Field-Level TTL (Redis 7.4+)" section, implying they were introduced in Redis 7.4. In reality, HGETDEL, HGETEX, and HSETEX were introduced in Redis 8.0.0. Added version annotations (Redis 8.0+) to the relevant code comments and updated the summary paragraph to clarify the distinction.

## Review Notes
- All other hash commands (HSET, HGET, HMGET, HGETALL, HSETNX, HEXISTS, HDEL, HLEN, HINCRBY, HINCRBYFLOAT, HKEYS, HVALS, HRANDFIELD, HSCAN, HEXPIRE, HTTL, HPTTL, HPERSIST) are syntactically correct and accurately described.
- HSCAN also supports an optional `NOVALUES` flag (added in Redis 7.4) that the post does not mention. This is not an error since the post covers the core usage, but could be a useful addition in a future update.
- HSETEX supports additional options (`FNX`, `FXX`, `KEEPTTL`) not mentioned in the post. Again, not an error for a cheat sheet, but worth noting for completeness.
- HEXPIRE supports condition flags (`NX`, `XX`, `GT`, `LT`) not shown in the post, which could be useful in advanced use cases.

# Validation Summary: How to Implement Complex Business Logic with Redis Lua

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Lua scripting
- Redis hashes, lists, strings, sorted sets, and key expiration
- redis-py
- Python
- JSON handling with Redis Lua `cjson`

## Sources Consulted
- Redis EVAL command documentation: https://redis.io/docs/latest/commands/eval/
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/programmability/eval-intro/
- Redis Lua API reference: https://redis.io/docs/latest/develop/programmability/lua-api/
- redis-py Lua scripting documentation: https://redis.readthedocs.io/en/stable/lua_scripting.html
- Redis keyspace notifications documentation: https://redis.io/docs/latest/develop/pubsub/keyspace-notifications/
- Redis HINCRBY command documentation: https://redis.io/docs/latest/commands/hincrby/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/

## Issues Found
- The order-processing Lua example validated each order line independently, so duplicate product IDs in a single order could pass validation and then oversell inventory. Updated both the standalone Lua and embedded Python script versions to aggregate requested quantity per product during validation.
- The financial transaction and reservation examples generated or derived Redis key names inside Lua (`daily_transfers:*` and `reservation_expiry:*`). Redis documentation says all keys accessed by a script should be explicitly provided as input key arguments. Updated the examples to receive those keys through `KEYS`.
- The reservation commit path returned `RESERVATION_EXPIRED` without releasing the reserved quantity or deleting the stale reservation record. Updated both the standalone Lua and embedded Python script versions to release the reserved count and remove reservation metadata when an expired reservation is encountered.
- The reservation timeout marker could be misread as automatically releasing inventory when it expires. Added a concise comment that a cleanup worker or keyspace notification handler must cancel expired reservations.

## Review Notes
The examples are technically valid patterns after the fixes. For production financial systems, amounts should generally be represented in the smallest currency unit as integers rather than floating-point values, even though `HINCRBYFLOAT` is a valid Redis command.

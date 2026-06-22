# Validation Summary: How to Analyze Redis Keyspace with SCAN

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis SCAN, KEYS, TTL, MEMORY USAGE, OBJECT IDLETIME, INFO keyspace
- redis-cli
- Python with redis-py
- Node.js with node-redis
- Bash scripting

## Sources Consulted
- Redis SCAN command documentation: https://redis.io/docs/latest/commands/scan/
- Redis KEYS command documentation: https://redis.io/docs/latest/commands/keys/
- Redis TTL command documentation: https://redis.io/docs/latest/commands/ttl/
- Redis MEMORY USAGE command documentation: https://redis.io/docs/latest/commands/memory-usage/
- Redis OBJECT IDLETIME command documentation: https://redis.io/docs/latest/commands/object-idletime/
- node-redis official README / scan iterator documentation: https://github.com/redis/node-redis

## Issues Found
- The post described SCAN as non-blocking and safe for production without enough caveat. Redis documents SCAN as incremental, with O(1) work per call and O(N) for a complete iteration, and it can return duplicate keys. Updated wording to describe lower production impact, rate limiting/monitoring, and idempotent processing.
- The description and Python helper name referred to "expired keys", but SCAN can only find keys still present in the keyspace; the helper actually finds keys expiring soon. Updated the description and renamed the helper to `find_expiring_keys`.
- The Python `analyze_key_pattern` method counted `TTL == -2` as a key with TTL set. Updated it to count only non-negative TTL values as TTL set.
- The Node.js scan loop compared the cursor strictly to numeric `0`, while Redis SCAN cursors are commonly represented as cursor strings by clients. Updated the loop to initialize with `'0'` and compare `String(cursor) !== '0'`.
- The Node.js TTL bucket logic classified `TTL == -2` as `shortTtl`. Updated it to skip missing keys.
- The TYPE filter guidance overstated efficiency. Redis SCAN TYPE filters by Redis type but does not avoid the full scan work for a complete iteration. Updated wording to say it avoids separate application-level TYPE calls.

## Review Notes
The examples remain intentionally simple and operationally useful. In a future revision, the Bash loop could mention that whitespace-containing Redis key names require more careful output handling than simple shell word splitting.

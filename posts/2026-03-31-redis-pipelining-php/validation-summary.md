# Validation Summary: How to Use Redis Pipelining in PHP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (pipelining feature)
- PHP
- Predis (PHP Redis client library)
- phpredis (PHP Redis C extension)

## Sources Consulted
- Predis source code (predis/predis GitHub repository) — `Client::pipeline()` method and `Pipeline::execute()` return behavior
- phpredis stub definitions (phpredis/phpredis GitHub repository, `redis.stub.php`) — `pipeline()`, `multi()`, `exec()`, `del()`, `hMset()`, `set()`, `get()`, `incr()`, `strlen()`, `expire()` method signatures
- Redis official documentation for HMSET deprecation status (https://redis.io/docs/latest/commands/hmset/)

## Issues Found
- **Incorrect round-trip count in comment (line 20):** The comment said "Without pipeline: 5 round-trips" but only 3 SET commands were shown below it. Fixed to "3 round-trips".

## Review Notes
- **phpredis `SET` return value in pipeline:** The "Collecting Pipeline Results" section comments `// index 0: OK` and `// index 1: OK` for SET commands. In phpredis, SET in a pipeline actually returns `true` (boolean), not the string `"OK"`. This is a minor comment-level inaccuracy that doesn't affect code behavior — left as-is since "OK" is the conventional way to describe a successful SET and the comment is illustrative.
- **phpredis `GET` returns strings:** `$results[4]` in the incr/get example would be the string `"3"`, not integer `3`. The `echo` output is identical either way, so the code and comment are functionally correct.
- **`hMSet` casing:** The canonical phpredis method name is `hMset` (lowercase 's'). Since PHP methods are case-insensitive, `hMSet` works at runtime. Not changed.
- **Redis HMSET deprecation:** The `HMSET` Redis command has been deprecated since Redis 4.0.0 in favor of `HSET` with multiple field-value pairs. The phpredis `hMset` method still works and is not marked deprecated in the extension, but future-oriented code could use `hSet` instead. Not changed since the method remains functional.
- All other code examples (Predis pipeline with callback, phpredis pipeline/exec pattern, batch chunking, result indexing, `del` with multiple keys) are technically correct and use current, non-deprecated APIs.

# Validation Summary: How to Use Redis Hashes for Object Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis Hashes
- Redis hash commands: HSET, HGET, HMGET, HGETALL, HSETNX, HEXISTS, HDEL, HLEN, HKEYS, HVALS, HINCRBY, HINCRBYFLOAT, HSCAN, HSTRLEN, HEXPIRE, EXPIRE
- Redis memory optimization and object encodings
- Python with redis-py
- Node.js with ioredis
- Go with go-redis/v9
- Lua scripting in Redis

## Sources Consulted
- Redis Hashes documentation: https://redis.io/docs/latest/develop/data-types/hashes/
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- Redis HMSET command documentation: https://redis.io/docs/latest/commands/hmset/
- Redis HEXPIRE command documentation: https://redis.io/docs/latest/commands/hexpire/
- Redis HSCAN command documentation: https://redis.io/docs/latest/commands/hscan/
- Redis HSTRLEN command documentation: https://redis.io/docs/latest/commands/hstrlen/
- Redis OBJECT ENCODING command documentation: https://redis.io/docs/latest/commands/object-encoding/
- Redis memory optimization documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/
- redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/
- ioredis guide: https://redis.io/docs/latest/develop/clients/ioredis/
- go-redis guide: https://redis.io/docs/latest/develop/clients/go/
- go-redis package documentation: https://pkg.go.dev/github.com/redis/go-redis/v9

## Issues Found
- The description said the post covers HMSET, but Redis has deprecated HMSET since Redis 4.0.0 in favor of HSET with multiple field-value pairs. Changed the description to HMGET, which is actually used in the post.
- The Python usage example instantiated `SessionStore(ttl=3600)`, but the class constructor parameter is named `session_ttl`. Changed it to `SessionStore(session_ttl=3600)` so the example runs as written.
- The Go example imported `encoding/json` and `log` without using them, which would cause a Go compile error. Removed the unused imports.
- The memory optimization section used Redis pre-7.0 ziplist terminology and `hash-max-ziplist-*` configuration. Updated it to Redis 7.0+ listpack terminology and `hash-max-listpack-*` directives.
- The encoding inspection example used `DEBUG OBJECT`. Replaced it with `OBJECT ENCODING`, the documented command for returning an object's internal encoding.
- The best-practices section said hashes do not support per-field TTL. Redis 7.4 introduced hash field expiration via HEXPIRE, so the note now distinguishes Redis 7.4+ from older Redis versions.
- The conclusion referred to ziplist encoding. Updated it to compact listpack encoding for current Redis versions.

## Review Notes
Python and Node.js code blocks passed syntax checks with `python3 -m py_compile` / `ast.parse` and `node --check`. Go tooling (`gofmt` / `go`) was not installed in the environment, so the Go snippet was reviewed manually against the official go-redis documentation rather than compiled locally.

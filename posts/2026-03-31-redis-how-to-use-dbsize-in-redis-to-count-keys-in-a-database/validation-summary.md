# Validation Summary: How to Use DBSIZE in Redis to Count Keys in a Database

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis (DBSIZE, SELECT, INFO keyspace, KEYS, SET, EXPIRE commands)
- Python (redis-py client library)
- Node.js (node-redis v4+ client library)
- Go (go-redis/v9 client library)

## Sources Consulted
- Redis official documentation for DBSIZE: https://redis.io/commands/dbsize/
- Redis official documentation for INFO: https://redis.io/commands/info/
- Redis official documentation for KEYS: https://redis.io/commands/keys/
- Redis key expiration documentation: https://redis.io/docs/latest/develop/use/keyspace-notifications/
- redis-py documentation: https://redis-py.readthedocs.io/
- node-redis documentation: https://github.com/redis/node-redis
- go-redis documentation: https://github.com/redis/go-redis

## Issues Found
1. **Unused `import time` in Capacity Planning section**: The "Capacity Planning with DBSIZE" Python code block included `import time` but never used the `time` module. Removed the unused import.

## Review Notes
- The post correctly identifies DBSIZE as O(1) — Redis maintains an internal key counter per database, so it doesn't need to iterate over keys.
- The comparison with KEYS * (O(N)) and INFO keyspace is accurate and useful.
- The explanation of lazy expiration affecting DBSIZE counts is correct — Redis uses both lazy expiration (on access) and active background expiration, so expired keys may briefly be counted.
- The health check code uses a clever `round(...) or 'unlimited'` pattern for maxmemory=0. This works because 0.0 is falsy in Python, but could confuse readers. Not a bug, just a readability note.
- All three client library examples (Python, Node.js, Go) use correct and current APIs.
- The Node.js example uses top-level `await`, which requires an async context or ES module top-level await. This is standard for code examples.

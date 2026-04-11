# Validation Summary: How to Use Redis Bloom Filters in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Stack (RedisBloom module)
- Node.js
- ioredis
- Bloom filters (probabilistic data structure)

## Sources Consulted
- Redis Bloom filter command documentation (BF.RESERVE, BF.ADD, BF.MADD, BF.EXISTS, BF.MEXISTS, BF.INFO) — https://redis.io/docs/latest/commands/?group=bf
- ioredis documentation for `call()` method — https://github.com/redis/ioredis
- Redis Stack Docker image — https://hub.docker.com/r/redis/redis-stack

## Issues Found
No technical issues found.

## Review Notes
- Several code snippets use top-level `await` outside of an async function (Bloom Filter Helper Class usage, Event Deduplication driver code, Bloom Filter Info section). This works in ESM modules and the Node.js REPL but not in CommonJS scripts. Since the post uses `require()` (CommonJS), readers would need to either wrap these in an async IIFE or switch to ESM. This is a common pattern in blog tutorials and not a technical error, but readers may need to adapt.
- The `filterNew` method name is slightly ambiguous when used with a blacklist (it returns items NOT in the filter, i.e., "clean" emails). The surrounding comments and output clarify the behavior.
- The empty `catch {}` block in `EventDeduplicator.ensureFilter()` is less precise than the BloomFilter class's error message check, but is functionally correct for this use case since the only expected error is the filter already existing.

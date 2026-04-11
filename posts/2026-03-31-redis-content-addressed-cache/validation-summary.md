# Validation Summary: How to Build a Content-Addressed Cache with Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (data store and caching)
- Python 3.10+ (union type syntax `X | None`)
- redis-py (Python Redis client library)
- hashlib (Python standard library for SHA-256 hashing)
- requests (Python HTTP library)

## Sources Consulted
- SHA-256 hash verification via Python hashlib — confirmed SHA-256("hello") = `2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824`, not `a665a459...` (which is SHA-256("123"))
- redis-py documentation on `decode_responses` parameter: https://redis-py.readthedocs.io/en/stable/connections.html — with `decode_responses=True`, all responses are decoded to Python `str`, making it incompatible with binary `bytes` operations
- Redis SET command documentation: https://redis.io/commands/set/ — verified `SET key value EX seconds` syntax
- Redis SETEX command documentation: https://redis.io/commands/setex/
- Redis SADD, SREM, SCARD command documentation: https://redis.io/commands/sadd/, https://redis.io/commands/srem/, https://redis.io/commands/scard/

## Issues Found

### 1. Incorrect SHA-256 hash example
- **What was wrong:** The "How It Works" diagram and the Redis CLI examples claimed SHA-256("hello") produces hash `a665a459...`. The actual SHA-256 of "hello" is `2cf24dba...`. The hash `a665a459...` is the SHA-256 of "123".
- **What was changed:** Replaced all occurrences of `a665a459` with `2cf24dba` in the diagram and CLI examples.
- **Why:** Readers verifying the example would get a different hash, undermining confidence in the tutorial.

### 2. `decode_responses=True` incompatible with bytes operations
- **What was wrong:** The Redis client was created with `decode_responses=True`, but the code works with `bytes` data throughout — `content_hash()` accepts `bytes`, `cache_content()` accepts `bytes`, `cache_file()` reads files in binary mode (`'rb'`), and `response.content` returns `bytes`. With `decode_responses=True`, `r.get()` returns `str` instead of `bytes`, and retrieving non-UTF-8 binary data would raise `UnicodeDecodeError`.
- **What was changed:** Removed `decode_responses=True` from the Redis constructor, leaving the default (`decode_responses=False`), which returns `bytes` from `r.get()`.
- **Why:** The code as written would fail at runtime for binary file caching and produce incorrect return types.

### 3. Unused `import os`
- **What was wrong:** The "Deduplication for File Assets" section imported `os` but never used it.
- **What was changed:** Removed the `import os` line.
- **Why:** Unused imports are incorrect code that would trigger linter warnings and confuse readers.

## Review Notes
- The `exists()` + `setex()` pattern in `cache_content()` has a benign race condition in concurrent environments. Using `SET key value NX EX ttl` would be atomic, but since both concurrent writers store identical content (same hash = same data), the race is harmless for a content-addressed cache. This is acceptable for a tutorial.
- The garbage collection `remove_reference()` function has a TOCTOU race between `scard()` and `delete()`. A Lua script would make it atomic, but this is a reasonable simplification for a blog post.
- The `cache_file()` function stores entire file contents in Redis, which is appropriate only for small files as the code comments note. Redis values can be up to 512 MB but large values degrade performance.
- With `decode_responses=False`, the string values stored via `r.setex(f"url:{url}", 3600, key)` will be returned as `bytes` by `r.get()`. This still works correctly since `json.loads()` and Redis key lookups accept both `bytes` and `str` in Python 3.

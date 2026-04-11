# Validation Summary: How to Use Redis Bloom Filters in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Stack (RedisBloom module)
- Python
- redis-py (Python Redis client)
- Docker

## Sources Consulted
- redis-py source code: `redis/commands/bf/commands.py` — verified `create()`, `add()`, `madd()`, `exists()`, `mexists()`, `insert()` signatures
- redis-py source code: `redis/commands/bf/info.py` — verified `BFInfo` class attribute names
- Redis official docs: BF.ADD command (https://redis.io/docs/latest/commands/bf.add/) — return value semantics
- Redis official docs: BF.RESERVE command (https://redis.io/docs/latest/commands/bf.reserve/) — parameter names
- Redis official docs: BF.INSERT command (https://redis.io/docs/latest/commands/bf.insert/)
- Redis official docs: BF.INFO command (https://redis.io/docs/latest/commands/bf.info/)
- Redis official docs: Bloom filter data type (https://redis.io/docs/latest/develop/data-types/probabilistic/bloom-filter/)

## Issues Found

### 1. Incorrect parameter name in `bf().create()` (3 occurrences)
- **What was wrong:** The post used `error_rate=0.001` as the keyword argument to `r.bf().create()`.
- **What was changed:** Changed to `errorRate=0.001` in all three `bf().create()` calls (Creating a Bloom Filter section, EmailBlacklist class, and Deduplication Stream Example).
- **Why:** The redis-py `bf().create()` method uses camelCase parameter `errorRate`, not snake_case `error_rate`. Using the wrong parameter name would cause a `TypeError`.

### 2. Incorrect return value comments for `bf().madd()`
- **What was wrong:** Comments stated `[False, False, False, False]` means all newly added and `[True]` means already in the filter. This is backwards.
- **What was changed:** Updated comments to `[1, 1, 1, 1]` means all newly added and `0` means item was likely already in the filter.
- **Why:** `BF.ADD`/`BF.MADD` return `1` for newly added items and `0` for items that likely already existed. The redis-py client returns these as integers, not booleans.

### 3. Incorrect `BFInfo` attribute name
- **What was wrong:** The post used `info.filterCount` to access the number of sub-filters.
- **What was changed:** Changed to `info.filterNum`.
- **Why:** The `BFInfo` class in redis-py uses the attribute name `filterNum`, not `filterCount`. Using `filterCount` would raise an `AttributeError`.

## Review Notes
- The deduplication stream example logic (`if r.bf().add(...)`) is correct — `add()` returns `1` (truthy) for newly added items, so the branching logic works as intended.
- The `bf().insert()` call uses `noCreate=False` which is the default behavior; this is technically redundant but acceptable for educational clarity.
- The use of `hashlib.md5` in the deduplication example is fine for fingerprinting but MD5 should not be used for security-sensitive hashing. This is acceptable in context since it is used for deduplication, not cryptography.
- The `exists()` and `mexists()` API usage is correct.
- The docker command and pip install instructions are correct for Redis Stack with RedisBloom support.

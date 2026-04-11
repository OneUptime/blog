# Validation Summary: How the allkeys-lfu Eviction Policy Works in Redis

## Status
validated

## Post Type
Tutorial / Technical Explainer

## Technologies Covered
- Redis (eviction policies, LFU algorithm)
- Python (redis-py client library)

## Sources Consulted
- Redis official eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/
- Redis source code (`src/server.h` for `LFU_INIT_VAL`, `src/evict.c` for LFU logic)
- redis-py library API documentation

## Issues Found

### 1. Incorrect LFU counter values table
**What was wrong:** The "LFU Counter Internals" section had a table claiming `lfu-log-factor=10` produces: 1 access -> ~10, 100 accesses -> ~18, 1000 accesses -> ~25, 1M accesses -> ~40. These values are incorrect — they appear shifted by orders of magnitude and the 1M value is completely wrong.

**What was changed:** Corrected the table to match the official Redis documentation: 100 accesses -> ~10, 1000 accesses -> ~18, 100K accesses -> ~142, 1M accesses -> ~255.

**Why:** The original values would mislead readers about the counter's behavior. In particular, claiming 1M accesses yields only ~40 contradicts the documented behavior where 1M hits saturates the 8-bit counter at 255 with `lfu-log-factor=10`.

### 2. Non-existent `object_freq()` method in redis-py
**What was wrong:** The Python code used `r.object_freq("hot_key")` and `r.object_freq("cold_key")`, but `object_freq()` does not exist in the redis-py library.

**What was changed:** Replaced with the correct API: `r.object("freq", "hot_key")` and `r.object("freq", "cold_key")`.

**Why:** The `object()` method in redis-py takes an `infotype` string parameter ("freq", "encoding", "refcount", "idletime") and a key name. There is no dedicated `object_freq()` convenience method.

### 3. Missing key creation before access loop
**What was wrong:** The first Python example called `r.get("hot_key")` and `r.get("cold_key")` without first creating those keys. Since GET on a non-existent key returns nil without creating the key, the subsequent `OBJECT FREQ` calls would fail.

**What was changed:** Added `r.set("hot_key", "value")` and `r.set("cold_key", "value")` before the access loops.

**Why:** Keys must exist in Redis before their LFU frequency counter can be queried.

## Review Notes
- The second Python example (benchmark with hot/cold keys) correctly creates keys with `r.set()` before accessing them, so it did not need the same fix.
- New keys in Redis start with an initial LFU counter value of 5 (`LFU_INIT_VAL`), not 0. The post does not mention this, but it is not incorrect — just an additional detail readers might find useful.
- The `OBJECT FREQ` command in the bash example is correct Redis CLI syntax.
- The explanation of decay mechanics and tuning parameters is accurate.

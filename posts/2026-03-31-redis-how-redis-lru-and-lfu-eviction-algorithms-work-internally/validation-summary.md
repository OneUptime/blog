# Validation Summary: How Redis LRU and LFU Eviction Algorithms Work Internally

## Status
validated

## Post Type
Technical deep-dive / Reference

## Technologies Covered
- Redis (core server internals)
- Redis LRU eviction (approximate, sampling-based)
- Redis LFU eviction (probabilistic logarithmic counter with decay, introduced in Redis 4.0)
- C (Redis source code excerpts)

## Sources Consulted
- Redis source code (`evict.c`, `server.h`, `object.h`, `config.c`) from https://github.com/redis/redis (unstable branch)
- Redis eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/

## Issues Found

### 1. Description incorrectly called LFU "exact" (line 7)
**What was wrong:** The description metadata said "approximate LRU and exact LFU eviction algorithms." Redis LFU is not exact — it uses a probabilistic logarithmic counter (Morris counter) that only reaches 0-255, combined with the same sampling-based eviction pool as LRU.
**What was changed:** Changed "exact LFU" to "approximate LFU."

### 2. LFULogIncr code used bare variable instead of struct field (line 100)
**What was wrong:** The code example showed `baseval*lfu_log_factor+1`, but the actual Redis source uses `baseval*server.lfu_log_factor+1` since the log factor is a field on the server config struct.
**What was changed:** Changed `lfu_log_factor` to `server.lfu_log_factor` to match the actual Redis source.

### 3. LFU decay example had incorrect calculation at Time 10 (lines 126-131)
**What was wrong:** The example showed the decay at Time 10 minutes as `counter = 20 - 10 = 10`, implying the decay is computed incrementally from the previously decayed value. In reality, Redis always computes decay from the original stored `ldt` (last decrement time). Since ldt=0 and current time=10, the elapsed is 10 minutes, giving `counter = 25 - 10 = 15`, not `20 - 10 = 10`.
**What was changed:** Fixed the Time 10 calculation to `counter = 25 - 10 = 15` and added a clarifying note that Redis computes decay from the stored ldt, not incrementally.

## Review Notes
- The `LRU_CLOCK()` function shown in the blog is a simplified version. The actual Redis source uses `getLRUClock()` with a cached clock optimization when server hz is high enough. This simplification is acceptable for a blog post.
- The blog does not explain `LFU_INIT_VAL` (which is 5 in Redis), though it appears in the `LFULogIncr` code. Readers unfamiliar with the source may wonder about this constant, but it does not constitute a technical error.
- All Redis CLI commands, CONFIG parameters, and their default values were verified as correct.
- The eviction pool size of 16, the 24-bit LRU clock structure, the `redisObject` struct layout, and the LFU field bit layout were all confirmed against the Redis source.

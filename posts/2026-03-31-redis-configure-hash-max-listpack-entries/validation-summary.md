# Validation Summary: How to Configure hash-max-listpack-entries for Memory Savings

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (7.0+, listpack encoding)
- Python (redis-py client library)
- Bash / redis-cli

## Sources Consulted
- [Memory optimization | Redis Docs](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/)
- [CONFIG GET | Redis Docs](https://redis.io/docs/latest/commands/config-get/)
- [OBJECT ENCODING | Redis Docs](https://redis.io/docs/latest/commands/object-encoding/)
- [Redis CLI | Redis Docs](https://redis.io/docs/latest/develop/tools/cli/)
- [redis.conf at unstable branch | GitHub](https://github.com/redis/redis/blob/unstable/redis.conf)
- [redis-py documentation | Redis Docs](https://redis.io/docs/latest/develop/clients/redis-py/)

## Issues Found

1. **Incorrect default value for `hash-max-listpack-entries`**: The post stated the default is 128, but the actual Redis default is **512**. This error propagated throughout the post, affecting the code example, output table, recommendations, and summary. Fixed all occurrences:
   - Default Thresholds section: changed comment from 128 to 512.
   - Python code: updated comment and test field counts from `[50, 100, 128, 129, 200]` to `[100, 300, 512, 513, 700]` to demonstrate the transition at the correct threshold.
   - Output table: updated to reflect the correct transition point at 513 fields with proportionally scaled memory values.
   - "Jump at 129 fields" changed to "jump at 513 fields".

2. **Incorrect example in "The Two Hash Encodings"**: The example added fields f1-f200 (202 total fields) and claimed the result would be `hashtable`, but with the actual default of 512, 202 fields would still use `listpack`. Changed to f1-f600 (602 total fields) to correctly exceed the threshold.

3. **Inconsistent "Adjusting the Thresholds" section**: The section showed setting `hash-max-listpack-entries` to 256 with a comment saying "Allow larger hashes to stay as listpack", but 256 is actually *lower* than the default of 512. Changed to 1024 to correctly demonstrate raising the threshold above the default.

4. **Overstated memory savings in description**: The description claimed "up to 5x" memory reduction, but the post's own data consistently shows ~2.5x. Changed to "up to 2.5x" to match the content.

5. **Practical Recommendations section**: Updated to reflect the correct default — previously recommended 512 (already the default) and called 128 the "default". Changed to recommend 1024 for memory-optimized use cases and 256 as a lower-than-default option for performance-critical scenarios.

6. **Summary paragraph**: Updated from "default of 128 is conservative" to "default of 512 works well for most use cases" and adjusted the suggested range from "256 or 512" to "1024".

## Review Notes
- The Python code uses `r.object_encoding(key)` which returns a decoded string in redis-py 4.x+ (via an internal response callback), so the `:12s` format specifier works correctly even without `decode_responses=True`. This is correct but could confuse readers who expect bytes from a default `redis.Redis()` connection.
- The post correctly notes that listpack-to-hashtable conversion is one-way at runtime but can be re-evaluated on restart. This is accurate behavior.
- The performance latency numbers in the trade-off section are illustrative approximations, not benchmarks. They correctly convey the O(n) vs O(1) difference.
- The post targets Redis 7.0+ (listpack encoding). For Redis 6.x and earlier, the equivalent parameters are `hash-max-ziplist-entries` and `hash-max-ziplist-value`, and the encoding is reported as `ziplist` rather than `listpack`. The post does not mention this version distinction, which could confuse users on older Redis versions.

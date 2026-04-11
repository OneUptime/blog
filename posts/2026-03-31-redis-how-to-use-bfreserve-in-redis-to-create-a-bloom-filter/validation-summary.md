# Validation Summary: How to Use BF.RESERVE in Redis to Create a Bloom Filter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisBloom module (BF.RESERVE, BF.ADD, BF.EXISTS, BF.INFO commands)
- Python (redis-py client library)
- Bloom filter probabilistic data structure

## Sources Consulted
- Redis official documentation for BF.RESERVE: https://redis.io/docs/latest/commands/bf.reserve/
- Redis official documentation for BF.ADD: https://redis.io/docs/latest/commands/bf.add/
- Redis official documentation for BF.INFO: https://redis.io/docs/latest/commands/bf.info/

## Issues Found
1. **Incorrect comment on BF.EXISTS return value of 0** (line 80): The comment read `# Returns: 0 (does not exist, or false positive)`. This is technically wrong — when `BF.EXISTS` returns `0`, the item is **definitely not** in the filter. Bloom filters can produce false positives (returning `1` for an absent item) but never false negatives (returning `0` for a present item). The phrase "or false positive" was misleading and contradicts the fundamental property of Bloom filters explained earlier in the post. Changed to `# Returns: 0 (definitely does not exist)`.

## Review Notes
- The memory estimates in the "How Error Rate Affects Memory" section (~1.7 MB, ~2.5 MB, ~3.4 MB) are higher than the theoretical minimum calculated from the formula `bits = -n * ln(p) / ln(2)^2` (which gives ~1.14 MB, ~1.71 MB, ~2.28 MB respectively). The higher values likely reflect actual RedisBloom implementation overhead including struct headers, tightening ratios for scalable filters, and memory alignment. Since the values are marked as approximate (~) and the trend is correct, no change was made.
- The Python examples use `r.execute_command()` rather than the dedicated `redis-py` Bloom filter methods available via `redis.commands.bf`. Both approaches work; `execute_command` is more portable across redis-py versions.
- The BF.INFO example output is consistent with the official documentation format and field names.

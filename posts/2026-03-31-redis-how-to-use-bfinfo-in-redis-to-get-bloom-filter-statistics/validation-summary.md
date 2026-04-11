# Validation Summary: How to Use BF.INFO in Redis to Get Bloom Filter Statistics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Stack
- RedisBloom module
- BF.INFO, BF.RESERVE, BF.MADD, BF.ADD commands
- Python (redis-py client)
- Node.js (node-redis client)

## Sources Consulted
- Official Redis documentation for BF.INFO: https://redis.io/commands/bf.info/
- Official Redis documentation for BF.RESERVE: https://redis.io/commands/bf.reserve/
- Official Redis documentation for BF.MADD: https://redis.io/commands/bf.madd/
- Official Redis documentation for BF.ADD: https://redis.io/commands/bf.add/

## Issues Found
1. **Overview text incorrectly described BF.INFO output fields**: The overview claimed BF.INFO shows "what false positive rate it was configured with" and "the number of hash functions in use." BF.INFO does not return either of these fields. It returns Capacity, Size, Number of filters, Number of items inserted, and Expansion rate. Fixed by replacing the inaccurate field descriptions with correct ones (sub-filter count, expansion rate, memory allocated).

2. **Misleading claim about sub-filter false positive rates**: The "Monitoring Filter Expansion" section stated "each sub-filter has a higher false positive rate." This is inaccurate — it is the overall/combined false positive rate that increases as more sub-filters are added, not each individual sub-filter. Fixed by changing the wording to "the overall false positive rate increases as more sub-filters are added."

## Review Notes
- All command syntaxes (BF.RESERVE, BF.MADD, BF.ADD, BF.INFO) are correct and match official documentation.
- The BF.INFO example output with all five fields (Capacity, Size, Number of filters, Number of items inserted, Expansion rate) is accurate.
- The default expansion rate of 2 is correctly stated.
- Python code examples use `execute_command()` which is the correct approach for RedisBloom commands via redis-py.
- Node.js code uses `sendCommand()` which is the correct low-level approach for the node-redis client.
- The response parsing logic in both Python and Node.js examples is correct for the flat key-value array format returned by BF.INFO.
- BF.RESERVE also supports a `NONSCALING` option not mentioned in the post, but this is not an error — the post focuses on expansion behavior which is the default.

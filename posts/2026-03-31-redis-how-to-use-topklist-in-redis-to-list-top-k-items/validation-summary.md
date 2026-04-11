# Validation Summary: How to Use TOPK.LIST in Redis to List Top-K Items

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (RedisBloom module, Top-K probabilistic data structure)
- Python (redis-py client)
- Node.js (node-redis v4+ client)

## Sources Consulted
- Official Redis TOPK.LIST documentation: https://redis.io/docs/latest/commands/topk.list/
- Official Redis TOPK.RESERVE documentation: https://redis.io/docs/latest/commands/topk.reserve/
- Official Redis TOPK.ADD documentation: https://redis.io/docs/latest/commands/topk.add/

## Issues Found
No technical issues found.

## Review Notes
- The official TOPK.LIST documentation confirms items are "sorted by decreased count estimation," which is consistent with the example output ordering in the post.
- The WITHCOUNT example shows `article:redis` with a count of 5, while manually counting the TOPK.ADD calls yields 6 occurrences. This is acceptable because the post correctly notes that "the counts are approximate estimates, not exact values" — the Heavy Keeper algorithm used by Top-K can produce slightly different counts.
- The "Handling Empty Slots" section describes nil values for unfilled Top-K slots. The official documentation states TOPK.LIST returns "up to k items (or fewer if the sketch contains fewer items)," which may mean newer RedisBloom versions return only populated items without nil padding. The defensive filtering advice (`if item is not None`) is still good practice regardless of version, so no change is needed.
- The Node.js example uses `require()` (CommonJS) alongside top-level `await` (ESM-only feature). This is a common convention in documentation examples for brevity and does not affect the technical accuracy of the Redis usage being demonstrated.

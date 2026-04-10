# Validation Summary: How to Use TOPK.ADD in Redis TopK Structure

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisBloom module (TOPK.ADD, TOPK.RESERVE, TOPK.LIST commands)
- TopK probabilistic data structure
- Count-Min Sketch (mentioned in comparison)

## Sources Consulted
- Official Redis TOPK.ADD documentation: https://redis.io/docs/latest/commands/topk.add/
- Official Redis TOPK.RESERVE documentation: https://redis.io/docs/latest/commands/topk.reserve/
- Redis Top-K data type overview: https://redis.io/docs/latest/develop/data-types/probabilistic/top-k/
- Redis blog "Meet Top-K": https://redis.io/blog/meet-top-k-awesome-probabilistic-addition-redis/
- HeavyKeeper algorithm paper (Junzhi Gong et al., USENIX ATC 2018)

## Issues Found

1. **Incorrect algorithm name**: The post described the internal algorithm as "Heavy Hitters algorithm (a combination of a Count-Min Sketch and a min-heap)". The correct algorithm is **HeavyKeeper**, which uses a hash-based counting structure with exponential decay and a min-heap. Fixed the description accordingly.

2. **False claim that TOPK.ADD auto-creates keys**: The post stated that TOPK.ADD auto-creates a TopK structure with default parameters if the key doesn't exist. This is incorrect — `TOPK.ADD` requires the key to already exist via `TOPK.RESERVE`, and will return an error on a non-existent key. Removed the auto-creation claim.

3. **Misleading "Default Structure Settings" section**: This section listed defaults (K=50, Width=8, Depth=7, Decay=0.9) as if they were auto-applied by TOPK.ADD. K is a required parameter of TOPK.RESERVE with no default. Rewrote the section to correctly describe TOPK.RESERVE's optional parameter defaults (Width=8, Depth=7, Decay=0.9).

4. **Examples missing required TOPK.RESERVE**: The "Add a Single Item", "Add Multiple Items", and "Handling Eviction Returns" examples used TOPK.ADD on keys without first calling TOPK.RESERVE, which would fail in practice. Added the necessary TOPK.RESERVE calls before each.

## Review Notes
- The TOPK.ADD vs CMS.INCRBY comparison table is accurate and helpful.
- The eviction explanation and mermaid diagram correctly describe the behavior.
- The TOPK.RESERVE examples throughout the Use Cases section were already correct (they all included TOPK.RESERVE before TOPK.ADD).

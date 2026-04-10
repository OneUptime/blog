# Validation Summary: How to Use TOPK.INFO in Redis to Get TopK Stats

## Status
validated

## Post Type
Reference / Command Guide

## Technologies Covered
- Redis
- RedisBloom module (v2.0.0+)
- TOPK.INFO command
- TOPK.RESERVE command
- TOPK.ADD command
- BF.INFO and CMS.INFO commands (comparison)

## Sources Consulted
- Redis official documentation for TOPK.INFO: https://redis.io/docs/latest/commands/topk.info/
- Redis official documentation for TOPK.ADD: https://redis.io/docs/latest/commands/topk.add/
- Redis official documentation for TOPK.RESERVE: https://redis.io/docs/latest/commands/topk.reserve/
- Redis official documentation for BF.INFO: https://redis.io/docs/latest/commands/bf.info/
- Redis official documentation for CMS.INFO: https://redis.io/docs/latest/commands/cms.info/

## Issues Found

1. **TOPK.ADD does not auto-create TopK structures.** The "Default Structure Parameters" example claimed that `TOPK.ADD` auto-creates a TopK structure on a non-existent key. Per the official docs, TOPK.ADD returns an error on a non-existent key. Fixed by changing the example to use `TOPK.RESERVE default_topk 50`, which correctly creates a TopK with default width/depth/decay parameters.

2. **Incorrect decay mechanism description.** The decay explanation referenced a "cuckoo eviction process," which is not how TopK decay works. The official docs describe decay as "the probability of reducing a counter in an occupied bucket (decay ^ bucket[i].counter)." Fixed to accurately describe the Heavy Keeper bucket counter decay mechanism.

3. **Configuration Drift Detection section repeated the auto-creation error.** It claimed a deleted TopK could be "auto-recreated by a TOPK.ADD call." Fixed to describe the scenario where someone recreates the structure with `TOPK.RESERVE` using only the k parameter, causing width/depth/decay to fall back to defaults.

4. **BF.INFO fields were incorrect.** The post listed BF.INFO as returning "capacity, size, number of filters, error rate." BF.INFO actually returns: capacity, size, number of filters, number of items inserted, and expansion rate. Fixed "error rate" to "items inserted, expansion rate."

5. **Minor consistency fix in drift detection example.** The "Actual" line showed `k=50` which contradicted the scenario (the user would specify k in TOPK.RESERVE). Changed to `k=200` to match the expected k value, with default width/depth/decay being the real drift.

## Review Notes
- The post describes the internal structure as a "Count-Min Sketch." RedisBloom's TopK actually uses a Heavy Keeper-like algorithm with fingerprinted buckets, which is CMS-inspired but not identical. The simplification is acceptable for a command reference post but could be noted in a future update.
- TOPK.INFO syntax, return format, and field names are all correct per the official documentation.
- CMS.INFO description (width, depth, count) is accurate.
- The TOPK.RESERVE example with custom parameters (`TOPK.RESERVE custom_topk 20 3000 10 0.925`) is syntactically correct.

# Validation Summary: How to Use CMS.INCRBY in Redis Count-Min Sketch

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisBloom module
- Count-Min Sketch (CMS) probabilistic data structure
- CMS.INCRBY, CMS.INITBYDIM, CMS.INITBYPROB, CMS.QUERY commands

## Sources Consulted
- Redis official documentation for CMS.INCRBY: https://redis.io/docs/latest/commands/cms.incrby/
- Redis official documentation for CMS.INITBYDIM: https://redis.io/docs/latest/commands/cms.initbydim/
- RedisBloom documentation: https://redis.io/docs/latest/develop/data-types/probabilistic/count-min-sketch/
- Count-Min Sketch paper by Cormode and Muthukrishnan for error bound formulas

## Issues Found

1. **False auto-creation claim (critical)**: The post had an entire section ("Auto-Creation on First Use") claiming that `CMS.INCRBY` auto-creates a sketch with default dimensions if the key does not exist. This is incorrect — `CMS.INCRBY` returns an error if the key does not exist. The key must be initialized first with `CMS.INITBYDIM` or `CMS.INITBYPROB`. Replaced the section with "Initialization Required" explaining the correct behavior.

2. **Incorrect key parameter description**: The syntax section described the `key` parameter as "(auto-created if not present)". Changed to "(must already exist)" to reflect actual behavior.

3. **Missing initialization in multiple examples**: Six examples used CMS.INCRBY on keys that were never initialized (`page_views`, `api_calls`, `events`, `hourly_events`, `daily_events`). Added `CMS.INITBYDIM` calls before each to ensure the examples would actually work if copy-pasted.

4. **Incorrect overcount error bound**: The post stated the overcount is bounded by `total_increments / width`. The actual Count-Min Sketch error bound is `e * total_increments / width` (where e ≈ 2.718, Euler's number). The missing constant factor of e understates the bound by approximately 2.7x. Fixed to include the correct formula.

5. **Inaccurate batch comment**: The batch reporting example had a comment saying "1000 events logged in a batch" but the actual counts (342 + 289 + 47 + 512) sum to 1190. Changed comment to "Events logged in a batch" to avoid the discrepancy.

## Review Notes
- The `--` comment style used in Redis code blocks is not valid Redis CLI syntax, but is a widely-used convention in Redis tutorials and documentation for readability. Left as-is since this is standard practice in the Redis blogging ecosystem.
- The mermaid diagram shows only 3 of 7 hash function rows for brevity, which is acceptable as an illustration.
- The comparison table between CMS.INCRBY and HINCRBY is accurate and provides good guidance for readers choosing between exact and approximate counting.
- The return value explanation correctly notes that Count-Min Sketch can only overcount, never undercount.

# Validation Summary: How to Use CMS.QUERY in Redis to Query Count-Min Sketch Frequencies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisBloom module (Count-Min Sketch commands)
- Python redis-py client

## Sources Consulted
- Redis official documentation for CMS.QUERY: https://redis.io/docs/latest/commands/cms.query/
- Redis official documentation for CMS.INCRBY: https://redis.io/docs/latest/commands/cms.incrby/
- Redis official documentation for CMS.INITBYDIM: https://redis.io/docs/latest/commands/cms.initbydim/
- Redis official documentation for CMS.INITBYPROB: https://redis.io/docs/latest/commands/cms.initbyprob/
- Redis official documentation for CMS.INFO: https://redis.io/docs/latest/commands/cms.info/
- Redis Count-Min Sketch data structure overview: https://redis.io/docs/latest/develop/data-types/probabilistic/count-min-sketch/

## Issues Found
1. **`CMS.ADD` command does not exist — should be `CMS.INCRBY`**: The post used `CMS.ADD` throughout (section heading, all code examples in bash and Python, and the summary). The correct Redis command for incrementing counts in a Count-Min Sketch is `CMS.INCRBY`. The six CMS commands in RedisBloom are: `CMS.INITBYDIM`, `CMS.INITBYPROB`, `CMS.INCRBY`, `CMS.QUERY`, `CMS.MERGE`, and `CMS.INFO`. All occurrences of `CMS.ADD` were replaced with `CMS.INCRBY`.

2. **Incorrect Redis version prerequisite**: The post stated "Redis 6.0 or later" as a requirement. The official documentation does not specify a minimum Redis server version; it specifies RedisBloom module version 2.0.0 or later. Changed the prerequisite to accurately state that Redis with RedisBloom module 2.0.0+ is required (bundled with Redis Stack).

## Review Notes
- The claim of "O(1) time complexity per item" in the summary is defensible. The official CMS.QUERY command page lists O(n) complexity where n is the number of items queried, meaning each individual item lookup within the sketch is O(1) but the command overall is O(n) for n items. The post's phrasing "O(1) per item" is technically accurate.
- The error bound formula `estimated_count <= true_count + (error_rate * total_items_added)` is confirmed by the official documentation, which describes the threshold as `error * total_count`.
- The overestimation guarantee (CMS never underestimates) is correct and confirmed by the data structure documentation stating CMS uses "over-counting" due to collisions.
- The Python code example correctly uses `execute_command` for RedisBloom module commands and the unpacking syntax `*items_to_check` is valid.
- The `CMS.INITBYPROB` parameter for probability is described in the docs as "the desired probability for inflated count" (a value between 0 and 1 exclusive). The post's example value of 0.999 is valid.

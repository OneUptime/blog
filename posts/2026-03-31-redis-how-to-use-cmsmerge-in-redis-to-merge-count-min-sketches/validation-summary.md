# Validation Summary: How to Use CMS.MERGE in Redis to Merge Count-Min Sketches

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RedisBloom module (Redis Stack)
- Count-Min Sketch probabilistic data structure
- Python redis client

## Sources Consulted
- Official Redis CMS.MERGE documentation (https://redis.io/commands/cms.merge/)
- Official Redis CMS.INCRBY documentation (https://redis.io/commands/cms.incrby/)
- Official Redis CMS.INITBYDIM documentation (https://redis.io/commands/cms.initbydim/)
- Official Redis CMS.QUERY documentation (https://redis.io/commands/cms.query/)
- RedisBloom source code (rm_cms.c, cms.c) for implementation details

## Issues Found

1. **`CMS.ADD` command does not exist — replaced with `CMS.INCRBY`**: The post used `CMS.ADD` throughout (8 occurrences in bash examples and Python code). The correct RedisBloom command for incrementing item counts in a Count-Min Sketch is `CMS.INCRBY`. There is no `CMS.ADD` command. All instances were replaced with `CMS.INCRBY`.

2. **WEIGHTS parameter only accepts integers, not floats**: The post used `WEIGHTS 1 2 1.5` in the weighted merge example. The RedisBloom implementation parses weights using `RedisModule_StringToLongLong()`, meaning only integer values are accepted. Changed `1.5` to `2` and updated the accompanying comment accordingly.

3. **Incorrect error message for dimension mismatch**: The post showed `(error) ERR CMS sketches have different dimensions` but the actual RedisBloom error message is `(error) CMS: width/depth is not equal`. Corrected to match the real error string.

4. **Misleading merge behavior description**: The post stated the merge operation "adds the counters from each source sketch into the destination." In reality, `CMS.MERGE` **overwrites** the destination's counters with the weighted sum of the source sketches — it does not add to existing destination values. Corrected the description to say "replaces the counters in the destination."

## Review Notes
- The arithmetic in the query result comments (e.g., 500 + 280 + 620 = 1400) is correct throughout the post. Note that Count-Min Sketches may return slightly higher counts due to hash collisions, so exact sums as shown are the ideal/expected case.
- The Python example correctly uses `execute_command` for RedisBloom commands, which is appropriate since the standard redis-py client does not have native CMS methods.
- The `for` loop in the "Merging Time-Window Sketches" section uses shell syntax which would not work directly in redis-cli; it is presented as a conceptual bash script pattern, which is acceptable for a tutorial.

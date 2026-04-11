# Validation Summary: How to Use CMS.INITBYDIM in Redis to Create a Count-Min Sketch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Stack
- RedisBloom module
- Count-Min Sketch (CMS) data structure
- Python (redis-py client)
- Node.js (node-redis client)
- Docker

## Sources Consulted
- Redis CMS.INITBYDIM documentation: https://redis.io/docs/latest/commands/cms.initbydim/
- Redis CMS.INITBYPROB documentation: https://redis.io/docs/latest/commands/cms.initbyprob/
- Redis CMS.INFO documentation: https://redis.io/docs/latest/commands/cms.info/
- Redis CMS.INCRBY documentation: https://redis.io/docs/latest/commands/cms.incrby/
- Redis CMS.QUERY documentation: https://redis.io/docs/latest/commands/cms.query/
- Redis Count-Min Sketch data type guide: https://redis.io/docs/latest/develop/data-types/probabilistic/count-min-sketch/
- RedisBloom source code (CMS_ProbInit implementation in src/cms.c)

## Issues Found

1. **CMS.INITBYPROB probability parameter was backwards (line 54)**: The post used `CMS.INITBYPROB sketch2 0.001 0.99`, but the `probability` parameter is the failure probability (delta), not the confidence level. A value of 0.99 means 99% chance of error, which is nonsensical. Changed to `0.01` (1% failure probability = 99% confidence), which correctly yields width=2000, depth=7 matching the CMS.INITBYDIM example.

2. **Width=5000 error rate claim was wrong (line 66)**: The comment stated "Width=5000 gives ~0.02% error". RedisBloom internally uses `width = ceil(2/error)`, so `error = 2/5000 = 0.0004 = 0.04%`. Changed to `~0.04% error`.

3. **Width/depth formulas were incorrect and confusingly written (lines 132-135)**: The original used `width = ceil(e / epsilon)` with `e` defined as "error rate" — conflating it with Euler's number from the academic formula. Replaced with the actual RedisBloom formulas: `width = ceil(2 / error)` and `depth = ceil(log2(1 / delta))`, with clear variable definitions.

4. **Error percentage comments in common configurations were all wrong by ~2x (lines 140-148)**: Using `error = 2/width`: Width=100 gives ~2% error (was ~1%), Width=1000 gives ~0.2% error (was ~0.1%), Width=10000 gives ~0.02% error (was ~0.01%). All corrected.

## Review Notes
- The memory formula `width * depth * 4 bytes` is correct for RedisBloom's 32-bit integer counters. This is an implementation detail that could change in future versions but is accurate for all current RedisBloom releases.
- The Python CMS.INFO parsing assumes RESP2 flat array format (`[key, value, key, value, ...]`). This works correctly with redis-py's default RESP2 protocol. If a user enables RESP3, the response would be a dictionary instead, which would break the parsing code. This is a minor edge case not worth fixing in the post.
- The "Depth=7 gives ~99% confidence" claim is accurate: delta = 0.5^7 = 0.0078, so confidence = 1 - 0.0078 = 99.2%.
- All command syntaxes (CMS.INITBYDIM, CMS.INCRBY, CMS.QUERY, CMS.INFO) are correct.
- Both the Python and Node.js code examples are syntactically correct and use current, non-deprecated APIs.

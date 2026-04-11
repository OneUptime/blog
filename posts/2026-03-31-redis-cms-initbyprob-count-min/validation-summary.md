# Validation Summary: How to Use CMS.INITBYPROB in Redis for Probability-Based CMS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (RedisBloom module)
- Count-Min Sketch (CMS) probabilistic data structure
- Python (redis-py client library)
- CMS.INITBYPROB, CMS.INITBYDIM, CMS.INFO, CMS.INCRBY, CMS.QUERY commands

## Sources Consulted
- Official Redis documentation for CMS.INITBYPROB: https://redis.io/docs/latest/commands/cms.initbyprob/
- RedisBloom source code (src/cms.c, src/rm_cms.c): https://github.com/RedisBloom/RedisBloom
- Count-Min Sketch theory (Cormode & Muthukrishnan)

## Issues Found

### 1. CRITICAL: `probability` parameter semantics were inverted
- **What was wrong**: The post described the `probability` parameter as "Desired probability that the error bound holds" and used high values like 0.999 for high confidence. In reality, this parameter is the failure probability (delta) — the probability of exceeding the error bound. Lower values mean higher confidence.
- **What was changed**: Corrected the parameter description, and changed all probability values throughout the post (0.999 → 0.001, 0.9999 → 0.0001, 0.95 → 0.05, 0.90 → 0.10, 0.99 → 0.01).
- **Why**: The Redis documentation explicitly states this is "the desired probability for inflated count" and gives the example "for a desired false positive rate of 0.1% (1 in 1000), enter 0.001."

### 2. Math formulas were incorrect
- **What was wrong**: The post stated `width = ceil(e / error)` (using Euler's number) and `depth = ceil(ln(1 / (1 - probability)))`. Redis actually uses `width = ceil(2 / error)` and `depth = ceil(log2(1 / probability))`.
- **What was changed**: Corrected both formulas and the corresponding Python code. Updated the Python output comment from `width=2719, depth=7` to `width=2000, depth=10`.
- **Why**: Verified against the RedisBloom source code (`CMS_DimFromProb` function in src/cms.c), which uses `ceil(2 / error)` for width and `ceil(log10f(delta) / log10f(0.5))` (equivalent to `ceil(log2(1/delta))`) for depth.

### 3. Redis CLI output was inconsistent with the command shown
- **What was wrong**: The command `CMS.INITBYPROB pageviews 0.001 0.999` would produce width=2000, depth=1 (not width=2000, depth=10 as shown). The output was only correct for probability=0.001.
- **What was changed**: Fixed the command to use `0.001` as the probability parameter, making the output (width=2000, depth=10) correct.
- **Why**: With the corrected probability value, the formulas produce the claimed dimensions.

## Review Notes
- The RedisBloom implementation uses `width = ceil(2/error)` rather than the textbook Count-Min Sketch formula `width = ceil(e/error)`. This is a deliberate implementation choice that produces slightly narrower sketches. The post now correctly reflects the Redis-specific formulas.
- The Python code examples use `r.execute_command()` for CMS commands, which is correct since redis-py does not have native methods for RedisBloom CMS commands in the base client. Users working with RedisBloom may also use the `redisbloom` package which provides dedicated methods.
- All CMS commands shown (CMS.INITBYPROB, CMS.INITBYDIM, CMS.INFO, CMS.INCRBY, CMS.QUERY) are valid RedisBloom 2.0.0+ commands with correct syntax.

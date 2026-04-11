# Validation Summary: How to Use CMS.INITBYDIM in Redis Count-Min Sketch

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisBloom module (Count-Min Sketch commands)
- CMS.INITBYDIM, CMS.INITBYPROB, CMS.INCRBY, CMS.QUERY, CMS.MERGE, CMS.INFO commands

## Sources Consulted
- Redis CMS.INITBYDIM documentation: https://redis.io/docs/latest/commands/cms.initbydim/
- Redis CMS.INITBYPROB documentation: https://redis.io/docs/latest/commands/cms.initbyprob/
- Redis CMS.MERGE documentation: https://redis.io/docs/latest/commands/cms.merge/
- Redis CMS.INCRBY documentation: https://redis.io/docs/latest/commands/cms.incrby/
- RedisBloom source code (cms.c): https://github.com/RedisBloom/RedisBloom/blob/master/src/cms.c — verified the `CMS_DimFromProb` function for exact width/depth formulas

## Issues Found

### 1. Wrong constant in error rate formula (width)
- **What was wrong:** The post used the classic academic Count-Min Sketch formula with Euler's number `e` (≈2.718) for the width-to-error relationship: `e / width`, `ceil(2.72 / error_rate)`. The actual RedisBloom implementation uses `width = ceil(2 / error)`, meaning error = `2 / width`.
- **What was changed:** Changed all error rate references from `e / width` to `2 / width`, and the rule-of-thumb formula from `ceil(2.72 / error_rate)` to `ceil(2 / error_rate)`.
- **Why:** The RedisBloom source code (`CMS_DimFromProb`) explicitly computes `*width = ceil(2 / error)`. Since this blog is about Redis's CMS commands, it must use Redis's formulas, not the original Cormode-Muthukrishnan academic formulas.

### 2. Wrong constant in depth/failure probability formula
- **What was wrong:** The post used `ceil(log(1 / delta))` (natural logarithm) for depth, yielding failure probabilities based on `e^(-depth)`. The actual RedisBloom implementation uses `ceil(log10(delta) / log10(0.5))` which equals `ceil(log2(1 / delta))`, yielding failure probabilities of `2^(-depth)`.
- **What was changed:** Changed the depth formula from `ceil(log(1 / delta))` to `ceil(log2(1 / delta))`.
- **Why:** The RedisBloom source code uses base-2 logarithm for depth calculation, not natural logarithm.

### 3. Incorrect error table values
- **What was wrong:** The error table stated overestimation as `total_count / width` (missing the factor of 2). For width=1,000 with 1M total counts, it showed ~1,000 (0.1%) when the correct value is ~2,000 (0.2%).
- **What was changed:** Updated the formula to `2 * total_count / width` and corrected all three table rows: 1,000→2,000 (0.2%), 100→200 (0.02%), 10→20 (0.002%).

### 4. Incorrect depth failure probability table values
- **What was wrong:** The depth table used `e^(-depth)` probabilities: depth 5 → ~0.67%, depth 7 → ~0.09%, depth 10 → ~0.0045%. The correct values using `2^(-depth)` are significantly higher.
- **What was changed:** Updated to: depth 5 → ~3.13%, depth 7 → ~0.78%, depth 10 → ~0.098%.

### 5. Incorrect worked example (0.1% error, 99.9% confidence)
- **What was wrong:** Width was calculated as ceil(2.72/0.001) = 2720 and depth as ceil(log(1000)) = 7.
- **What was changed:** Corrected to width = ceil(2/0.001) = 2000 and depth = ceil(log2(1000)) = 10. Updated the corresponding Redis command from `CMS.INITBYDIM events 2720 7` to `CMS.INITBYDIM events 2000 10`.

### 6. Incorrect memory calculation
- **What was wrong:** Memory was calculated as 2720 * 7 * 4 = 76,160 bytes (~74 KB) with a 700x reduction. This was based on the incorrect width and depth from the worked example.
- **What was changed:** Corrected to 2000 * 10 * 4 = 80,000 bytes (~78 KB) with a ~640x reduction.

## Review Notes
- The CMS.MERGE example (`CMS.MERGE combined 2 events events2`) is syntactically correct, but per Redis documentation the destination key must be pre-initialized with matching width and depth. The post doesn't note this requirement, but since it's just a brief command reference and not a MERGE tutorial, this is a minor omission.
- The post uses `--` as comment syntax in Redis code blocks. Redis CLI does not support comments, so copy-pasting these blocks directly would cause errors. This is a common blog convention and not changed.
- The command syntax, CMS.INFO output format, CMS.INCRBY/CMS.QUERY syntax, and general CMS theory (always overestimates, never underestimates) are all correct.
- The comparison table between CMS.INITBYDIM and CMS.INITBYPROB is accurate.

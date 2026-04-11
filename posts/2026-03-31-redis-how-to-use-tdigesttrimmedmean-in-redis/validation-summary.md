# Validation Summary: How to Use TDIGEST.TRIMMED_MEAN in Redis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Redis T-Digest (RedisBloom module)
- Python (redis-py client)

## Sources Consulted
- Redis official documentation for TDIGEST.TRIMMED_MEAN: https://redis.io/docs/latest/commands/tdigest.trimmed_mean/
- Redis official documentation for TDIGEST.CREATE: https://redis.io/docs/latest/commands/tdigest.create/
- Redis official documentation for TDIGEST.ADD: https://redis.io/docs/latest/commands/tdigest.add/
- Redis official documentation for TDIGEST.QUANTILE: https://redis.io/docs/latest/commands/tdigest.quantile/

## Issues Found

### 1. Incorrect parameter names in syntax section
- **What was wrong:** The blog used `low_cut_fraction` and `high_cut_fraction` as parameter names. The official Redis documentation uses `low_cut_quantile` and `high_cut_quantile`.
- **What was changed:** Renamed parameters to match official documentation.
- **Why:** The parameters are quantile boundaries defining the range of data to include, not "fractions to trim." Using the official names avoids confusion.

### 2. Misleading parameter descriptions
- **What was wrong:** The blog described `low_cut_fraction` as "fraction to trim from the low end" and `high_cut_fraction` as "fraction to trim from the high end." This is misleading — e.g., a `high_cut_quantile` of 0.95 means "exclude values above the 95th percentile," not "trim 0.95 from the high end."
- **What was changed:** Rewrote descriptions to accurately reflect that these are quantile boundaries: values below `low_cut_quantile` are excluded, and values at or above `high_cut_quantile` are excluded.
- **Why:** The original descriptions would confuse readers about what the numeric values mean.

### 3. Incorrect constraint on parameters
- **What was wrong:** The blog stated "The sum of fractions must be less than 1.0." This is incorrect — e.g., `(0.1, 0.9)` sums to 1.0 and is perfectly valid. The actual constraint is that `low_cut_quantile` must be less than `high_cut_quantile`, with both in the range [0, 1].
- **What was changed:** Replaced the sum constraint with the correct constraint: `low_cut_quantile` must be less than `high_cut_quantile`.
- **Why:** The original constraint was factually wrong and contradicted the blog's own examples.

### 4. Incorrect error case example
- **What was wrong:** The blog showed `TDIGEST.TRIMMED_MEAN latency 0.5 0.6` as an error case, claiming "Fractions that sum to >= 1.0" cause errors. In reality, `(0.5, 0.6)` is a perfectly valid call that computes the mean of values between the 50th and 60th percentiles.
- **What was changed:** Replaced with two correct error examples: (1) reversed quantiles `(0.9, 0.1)` where low > high, and (2) out-of-range quantile `(-0.1, 0.9)`.
- **Why:** The original error case would not actually produce an error.

### 5. Incorrect empty T-Digest return value
- **What was wrong:** The blog stated that an empty T-Digest returns `(nil)`. According to the official documentation, it returns `nan`.
- **What was changed:** Changed `(nil)` to `nan`.
- **Why:** The official documentation specifies `nan` as the return value for empty sketches.

## Review Notes
- The blog's usage examples (the actual command invocations with values like 0.05/0.95, 0.1/0.9, etc.) are all correct — the parameters were used correctly throughout, only the descriptions and names were wrong.
- The Python example correctly uses `execute_command` for T-Digest commands, which is appropriate since redis-py may not have native T-Digest method support in all versions.
- The conceptual explanations of trimmed means and their use cases (latency monitoring, A/B testing, outlier removal) are accurate and well-presented.

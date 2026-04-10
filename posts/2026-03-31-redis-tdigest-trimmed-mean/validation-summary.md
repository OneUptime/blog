# Validation Summary: How to Use TDIGEST.TRIMMED_MEAN in Redis T-Digest

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis (RedisBloom module, v2.4+)
- T-Digest probabilistic data structure
- TDIGEST.TRIMMED_MEAN, TDIGEST.CREATE, TDIGEST.ADD commands

## Sources Consulted
- Redis official documentation for TDIGEST.TRIMMED_MEAN: https://redis.io/docs/latest/commands/tdigest.trimmed_mean/
- Redis official documentation for TDIGEST.ADD: https://redis.io/docs/latest/commands/tdigest.add/
- Redis official documentation for TDIGEST.CREATE: https://redis.io/docs/latest/commands/tdigest.create/
- Redis T-Digest data type overview: https://redis.io/docs/latest/develop/data-types/probabilistic/t-digest/
- RedisBloom source / test suite for error behavior verification

## Issues Found

### 1. Missing TDIGEST.CREATE before TDIGEST.ADD in multiple examples
**What was wrong:** Several examples called `TDIGEST.ADD` on keys without first calling `TDIGEST.CREATE`. Unlike some other RedisBloom data structures, T-Digest does NOT auto-create on ADD — a CREATE is required first.
**What was changed:** Added `TDIGEST.CREATE <key>` before the first `TDIGEST.ADD` for the following keys: `response-times`, `benchmark:runs`, `temperature:outdoor`, and `demo`.
**Why:** Without the CREATE call, these examples would fail with an error when run against Redis.

### 2. Incorrect claim that reversed quantile range returns "nan"
**What was wrong:** The "Empty Range Returns nan" section claimed that `TDIGEST.TRIMMED_MEAN latency 0.9 0.1` (where low > high) returns `"nan"`. In reality, Redis returns an error when `low_cut_quantile >= high_cut_quantile`. The `"nan"` return value is reserved for empty sketches only.
**What was changed:** Renamed section to "Invalid Range Returns an Error", updated the output to show an error response, and clarified the explanation.
**Why:** The original text would mislead readers into expecting a nan return instead of an error, causing confusion when running the command.

### 3. Invalid Redis comment syntax (`--`)
**What was wrong:** Several code blocks used `--` as inline comments. Redis does not support any comment syntax in its command protocol; these lines would cause parse errors in redis-cli.
**What was changed:** Removed `--` comments from code blocks and moved the explanatory text outside the code fences as prose.
**Why:** Blog readers copying commands into redis-cli would encounter errors.

### 4. Minor arithmetic correction
**What was wrong:** The regular mean of (10, 20, 30, 40, 50, 10000) was stated as "~1693" but the actual value is ~1691.67.
**What was changed:** Corrected to "~1692".
**Why:** Minor accuracy improvement.

## Review Notes
- The syntax, parameter names (`low_cut_quantile`, `high_cut_quantile`), return type description, and time complexity (O(N) centroids) are all correct per official Redis documentation.
- The claim that "accuracy is higher at the tails than at the center" is correct — T-Digest by design maintains higher precision near q=0 and q=1.
- Output values shown (e.g., "55", "75") are approximate since T-Digest is a probabilistic data structure. The post appropriately notes this in the Performance Considerations section.
- The post correctly identifies that TDIGEST.TRIMMED_MEAN is part of the RedisBloom module (available since v2.4), though it doesn't explicitly state this module dependency. Readers may not realize they need RedisBloom installed.

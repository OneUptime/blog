# Validation Summary: How to Use TDIGEST.QUANTILE in Redis for Percentile Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (RedisBloom / Redis Stack T-Digest module)
- TDIGEST.QUANTILE, TDIGEST.CREATE, TDIGEST.ADD commands
- Python (redis-py client)
- Node.js (node-redis client)

## Sources Consulted
- Redis official documentation for TDIGEST.QUANTILE: https://redis.io/docs/latest/commands/tdigest.quantile/
- Redis official documentation for TDIGEST.CREATE: https://redis.io/docs/latest/commands/tdigest.create/
- Redis official documentation for TDIGEST.ADD: https://redis.io/docs/latest/commands/tdigest.add/
- Redis T-Digest data type documentation: https://redis.io/docs/latest/develop/data-types/t-digest/
- T-Digest paper by Ted Dunning (arxiv.org/abs/1902.04023) for accuracy characteristics

## Issues Found

1. **Empty T-Digest return value was incorrect (line 162):** The post claimed `TDIGEST.QUANTILE` on an empty T-Digest returns `(nil)`. Per official Redis documentation, it returns `nan` (not a number) for all quantiles when the sketch is empty. Fixed `(nil)` to `(nan)` in the edge cases section.

2. **Summary repeated the nil error (line 177):** The summary section stated the command "returns nil for empty structures." Corrected to "returns nan for empty structures."

3. **Accuracy section had contradictory error numbers (lines 167-173):** The post correctly stated that T-Digest is "most accurate at extreme percentiles (p99, p99.9) compared to p50," but then listed error values that contradicted this (p50 < 1%, p99 < 1%, p99.9 < 2% — implying p99.9 has the highest error). T-Digest by design has the tightest error bounds at the extremes (near 0 and 1) and largest error near the median (0.5). Rewrote the error estimates to correctly reflect this ordering: p99 and p99.9 have lower error than p50.

4. **Misleading compression advice for p50 (line 173):** The post stated "For p50 tracking alone, lower compression is sufficient and more memory-efficient." Since T-Digest is least accurate at p50, lower compression would make p50 estimates worse, not better. Replaced with a correct general statement about compression trade-offs.

## Review Notes
- The Node.js example uses top-level `await` (line 144) outside an async function, which only works in ES modules. This is a minor style choice and not incorrect per se, but readers using CommonJS (`require`) may need to wrap it in an async IIFE.
- The Python `int(quantile * 100)` percentile naming (line 96) works for the quantiles used in the example (0.50, 0.95, 0.99) but would produce "p99" instead of "p99.9" for quantile 0.999. This is acceptable since 0.999 is not in the example's SLA thresholds.
- All Redis command syntax (TDIGEST.CREATE, TDIGEST.ADD, TDIGEST.QUANTILE) verified correct against official documentation.
- The quantile-to-percentile mapping table is accurate.
- Edge case behavior for quantile 0.0 (minimum) and 1.0 (maximum) is correctly described per official docs.

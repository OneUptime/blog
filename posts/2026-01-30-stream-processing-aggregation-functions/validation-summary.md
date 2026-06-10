# Validation Summary: How to Implement Aggregation Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Stream processing aggregation algorithms (TypeScript / Python implementations)
- Welford's online algorithm for variance and standard deviation
- T-Digest for streaming percentile estimation
- HyperLogLog for approximate distinct-count estimation
- Windowed aggregations: tumbling, sliding, and session windows
- Monotonic deques for sliding-window min/max
- Watermarks and allowed-lateness for out-of-order/late event handling
- Parallel/partitioned aggregation and mergeable aggregator pattern
- LRU eviction for bounded keyed aggregation

## Sources Consulted
- Welford, B. P. (1962). "Note on a method for calculating corrected sums of squares and products" — and the standard formulation in Knuth, TAOCP Vol. 2 (https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm)
- Flajolet, Fusy, Gandouet, Meunier (2007). "HyperLogLog: the analysis of a near-optimal cardinality estimation algorithm" (https://en.wikipedia.org/wiki/HyperLogLog) — including the alpha_m correction `0.7213 / (1 + 1.079/m)` for m >= 128 and the small-range linear-counting correction
- Dunning & Ertl, "Computing Extremely Accurate Quantiles Using t-Digests" (https://github.com/tdunning/t-digest) — including the centroid-count bound near `compression * π / 2`
- Apache Flink event-time / watermark / allowed-lateness semantics (https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/)
- Apache Beam windowing model (https://beam.apache.org/documentation/programming-guide/#windowing)
- Sliding-window minimum/maximum with monotonic deque — classic O(1) amortized algorithm (e.g. https://leetcode.com/problems/sliding-window-maximum/ editorial discussions)
- MDN: `Math.clz32`, `Uint8Array`, unsigned right shift `>>>` semantics for the JavaScript register-and-shift logic in the HyperLogLog example

## Issues Found

1. **HyperLogLog leading-zero count was inflated by `precision` bits.**
   The original `accumulate` did:
   ```ts
   const leadingZeros = this.countLeadingZeros(hashValue >>> Math.log2(this.numRegisters)) + 1;
   ```
   After `hashValue >>> precision`, the high `precision` bits of the resulting 32-bit value are zero. The custom `countLeadingZeros` scans from bit 31, so it always counted those `precision` artificial zero bits in addition to the real leading zeros in `w`. This made every register hold values that were `precision` larger than the true `rho(w)`, breaking the cardinality estimate (the estimator denominator would be dominated by an extremely small `2^(-M[j])`).
   Fixed by subtracting `precision` from the count:
   ```ts
   const precision = Math.log2(this.numRegisters);
   const remaining = hashValue >>> precision;
   const leadingZeros = this.countLeadingZeros(remaining) - precision + 1;
   ```
   Also corrected the misleading "Use first bits to determine register" comment to "Use low bits..." since `& (numRegisters - 1)` masks the low `precision` bits.

2. **`WatermarkedAggregator` "late_accepted" test did not actually exercise the late path.**
   The original test:
   ```ts
   const agg = new WatermarkedAggregator(60000, 10000);
   agg.accumulate({ eventTime: 50000, value: 10 }); // sets watermark to 40000
   expect(agg.accumulate({ eventTime: 45000, value: 20 })).toBe('late_accepted');
   ```
   After the first event, watermark = 50000 − 10000 = 40000. The second event still falls in window [0, 60000), whose `windowEnd` (60000) is *not* less than the watermark (40000), so the implementation's check `windowEnd < watermark ? 'late_accepted' : 'accepted'` returns `'accepted'` and the test would fail.
   Rewrote the test to actually advance the watermark past `windowEnd` before the late event arrives (using `allowedLateness = 30000`, an intermediate event at `eventTime = 100000` that pushes the watermark to 70000, then a late event at `eventTime = 55000` for the now-closed first window). This is still within `allowedLateness`, so the `dropped` branch is not triggered and the late event correctly returns `'late_accepted'`.

## Review Notes

- The Welford's-algorithm implementation matches the standard online formulation. Walking through the worked example in the "Combining Aggregations" section (values 10, 20, 15) produces mean = 15, M2 = 50, sample variance = 50 / 2 = 25, stddev = 5 — exactly what the comment claims.
- The T-Digest implementation is explicitly described as "Simplified" — it lacks the proper k-size scale function and interpolation between centroids that a production t-digest uses, but the merge-by-weight approach and the `compression * π / 2` centroid bound are consistent with the published algorithm at this fidelity level. Readers should treat it as illustrative, not production-grade.
- The HyperLogLog example uses a tiny non-cryptographic `hash` (the djb2-style "hash << 5 - hash + char") that has known biases; the post itself notes "use a proper one in production" — fine as a teaching example, but worth keeping in mind. For 32-bit precision, MurmurHash3 or xxHash32 is the standard choice.
- The `PreAggregator.accumulate` calls `this.flush()` on the periodic-flush branch but throws away the returned batch. That is a design quirk rather than a correctness bug — in practice a caller-driven flush loop (or a callback) would be more useful — but left as-is to respect the "do not restructure" review guidance.
- The `SlidingWindowMinMax` class declares a private `events` array that is never used; minor dead code, not a correctness issue.
- The monotonic-deque sliding-window min/max is the standard textbook algorithm; comments and code agree (min deque is non-decreasing from front to back, max deque is non-increasing).
- The watermark advancement formula `newWatermark = max(watermark, eventTime - allowedLateness)` is one common heuristic; Flink's bounded-out-of-orderness watermark generator uses the same form. The post does not claim this is the only strategy, which is appropriate.

# Validation Summary: How to Create Weighted Round Robin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Weighted Round Robin (classic and smooth/nginx variants)
- TypeScript
- async-mutex (npm library) for thread-safe synchronization
- Mermaid diagrams (flowchart and pie)
- General load balancing concepts (health checks, dynamic weight adjustment)

## Sources Consulted
- nginx smooth weighted round-robin algorithm (the canonical algorithm described in nginx's upstream module: `current_weight += effective_weight; pick max; selected.current_weight -= total`).
- async-mutex npm package API (`Mutex.acquire()` returns a `release` function; matches the post's usage).
- Verified all numeric examples (capacity-based weight, benchmark-based weight, dynamic weight multiplier, and the 10-request smooth WRR sequence) by executing the actual TypeScript logic in Node.

## Issues Found
1. **Incorrect smooth WRR sequence (intro text).** The post claimed the smooth algorithm with weights 5:3:2 produces `A,B,A,C,A,B,A,B,A,C`. Tracing the algorithm (and the post's own step-by-step table) actually yields `A,B,C,A,A,B,A,C,B,A`. Updated the intro paragraph to use the correct sequence.
2. **Incorrect smooth WRR sequence (Mermaid diagram).** The "Smooth (Interleaved)" subgraph in the comparison diagram showed `A,B,A,C,A,B,A,B,A,C`. Updated to match the actual algorithm output `A,B,C,A,A,B,A,C,B,A`.
3. **Incorrect sequence comment in `SmoothWeightedRoundRobin` usage example.** The code comment claimed the loop would log `srv-1, srv-2, srv-1, srv-3, srv-1, srv-2, srv-1, srv-2, srv-1, srv-3`. Corrected to the actual output `srv-1, srv-2, srv-3, srv-1, srv-1, srv-2, srv-1, srv-3, srv-2, srv-1`.
4. **Wrong values in capacity-based weight example comment.** With the given `calculateWeight` implementation (which uses `Math.ceil(weight * 1.2)` for the SSD bonus), the actual results are `large=39, medium=20, small=6`. The comment said `large=38, medium=18, small=6`. Corrected.
5. **Wrong value in benchmark-based weight example comment.** With the scoring formula `rps / (1 + p99/100)` and `Math.round` normalization, `srv-2` rounds to `2`, not `3`. Updated the comment from `srv-1=5, srv-2=3, srv-3=1` to `srv-1=5, srv-2=2, srv-3=1`.

## Review Notes
- The step-by-step trace table for the smooth WRR algorithm (rounds 1-5) was independently verified and is correct.
- The dynamic weight adjustment example for `srv-1` (response time 300ms, error rate 5%) correctly yields an effective weight of ~3 from a base weight of 5 (verified: multiplier = 0.54, `Math.round(5 * 0.54) = 3`).
- The classic algorithm's expanded list and its annotated sequence comment are both correct.
- The complexity table is reasonable: O(n) for smooth WRR per selection is consistent with the linear max-scan in the example code.
- The `async-mutex` API usage (acquire → release in finally) is current and correct.
- The "normalizeWeights" example is a reasonable pattern but the condition `min > 1000000 || min < -1000000` is somewhat unusual (it triggers on either extreme but always subtracts the minimum). Acceptable for an illustrative example; not changed since it isn't strictly wrong.

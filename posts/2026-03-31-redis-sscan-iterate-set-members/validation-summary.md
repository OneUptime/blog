# Validation Summary: How to Use SSCAN in Redis to Iterate Over Set Members

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis (SSCAN, SMEMBERS, SADD, SREM commands)
- Redis SCAN-family cursor-based iteration
- Redis set data structure

## Sources Consulted
- Official Redis SSCAN documentation: https://redis.io/docs/latest/commands/sscan/
- Official Redis SCAN documentation (SSCAN inherits SCAN semantics): https://redis.io/docs/latest/commands/scan/
- Official Redis SMEMBERS documentation: https://redis.io/docs/latest/commands/smembers/

## Issues Found
1. **Incorrect per-call time complexity in Performance Considerations section (line 199)**
   - **What was wrong:** The post stated "Each SSCAN call is O(N) where N is the number of members returned in that batch" and "Total complexity across all calls to complete a scan is O(S) where S is the set size."
   - **What was changed:** Corrected to "Each SSCAN call is O(1) amortized" and "Total complexity across all calls to complete a full scan is O(N) where N is the set size."
   - **Why:** The official Redis documentation for the SCAN family of commands explicitly states the time complexity as "O(1) for every call. O(N) for a complete iteration, including enough command calls for the cursor to return back to 0. N is the number of elements inside the collection." The per-call complexity is O(1), not O(N).

## Review Notes
- The post does not explicitly mention that SSCAN may return **duplicate elements** across calls. This is implied by the guarantee that members appear "at least once," but an explicit note could help readers avoid bugs in their iteration logic. Not changed since it's not an error.
- The `--` comment syntax used in some Redis code blocks (e.g., "Safe Full-Set Export" and "Periodic Cleanup Scan" sections) is not valid redis-cli syntax. However, these blocks are clearly pseudocode/illustrative and not meant to be pasted verbatim, so this was left as-is.
- All other technical claims, code examples, syntax descriptions, guarantees, and comparisons are accurate per current Redis documentation.

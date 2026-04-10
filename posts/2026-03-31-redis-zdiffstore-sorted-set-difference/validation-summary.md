# Validation Summary: How to Use ZDIFFSTORE in Redis for Sorted Set Difference

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis 6.2+
- Redis Sorted Sets
- ZDIFFSTORE command
- ZDIFF command

## Sources Consulted
- Official Redis ZDIFFSTORE documentation: https://redis.io/docs/latest/commands/zdiffstore/
- Official Redis ZDIFF documentation: https://redis.io/docs/latest/commands/zdiff/
- Official Redis ZRANGE documentation: https://redis.io/docs/latest/commands/zrange/

## Issues Found
1. **Incorrect time complexity formula and variable definitions** (Performance Considerations section):
   - **What was wrong:** The post stated `O(L log(L) + (N - K) log(N))` where L = first set size, N = total member count across all sets, K = intersection size. The official Redis docs specify the complexity as `O(L + (N-K)log(N))` where L = total number of elements in all the sets, N = size of the first set, K = size of the result set. The formula had an extra `log(L)` factor, and the variable definitions for L and N were swapped. K was also misdefined as "intersection size" rather than "result set size."
   - **What was changed:** Corrected the formula to `O(L + (N - K) log(N))` and fixed all three variable definitions to match the official documentation.

## Review Notes
- All code examples produce correct output for the given inputs. ZRANGE ordering (ascending by score) is consistent throughout.
- The syntax documentation, return value description, and behavioral explanations (scores from first set, difference semantics) are all accurate.
- The ZDIFF vs ZDIFFSTORE comparison section is correct.
- The mermaid diagram accurately illustrates the three-set difference operation.

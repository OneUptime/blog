# Validation Summary: How to Use ZUNION in Redis to Find Sorted Set Unions

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis (sorted sets)
- ZUNION command (introduced in Redis 6.2.0)
- ZUNIONSTORE command (for comparison)

## Sources Consulted
- Official Redis ZUNION documentation: https://redis.io/docs/latest/commands/zunion/
- Official Redis ZUNIONSTORE documentation: https://redis.io/docs/latest/commands/zunionstore/
- Official Redis ZADD documentation: https://redis.io/docs/latest/commands/zadd/

## Issues Found
1. **Incorrect output ordering in "Merged Tag Frequency" example**: The output showed `docker` (score 6) before `postgres` (score 4), but ZUNION returns results sorted by score in ascending order. Fixed by swapping the positions of `postgres` (score 4) and `docker` (score 6) so the output correctly reflects ascending score order: kafka(2), postgres(4), docker(6), redis(9).

## Review Notes
- All other examples (SUM, MIN, MAX aggregation, WEIGHTS, missing keys) have correct output values and correct ascending score ordering.
- The syntax, version information (Redis 6.2), time complexity (O(N) + O(M log M)), and ZUNION vs ZUNIONSTORE comparison are all accurate per the official documentation.
- The ZADD command syntax used throughout (`ZADD key score member`) is correct.
- The mermaid diagram correctly illustrates SUM aggregation behavior.

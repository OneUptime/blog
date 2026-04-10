# Validation Summary: How to Use ZINTER in Redis to Find Sorted Set Intersections

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis (6.2+)
- Redis Sorted Sets
- ZINTER command
- ZINTERSTORE and ZINTERCARD commands (comparison)

## Sources Consulted
- Redis official documentation for ZINTER: https://redis.io/docs/latest/commands/zinter/
- Redis official documentation for ZINTERSTORE: https://redis.io/docs/latest/commands/zinterstore/
- Redis official documentation for ZINTERCARD: https://redis.io/docs/latest/commands/zintercard/

## Issues Found
1. **Incorrect output ordering in Multi-Criteria Scoring example**: The ZINTER command returns results sorted by score in ascending order. The example showed `doc:2` (score 83) before `doc:1` (score 81.5), but `doc:1` should appear first since 81.5 < 83. Fixed the output order to list `doc:1` (81.5) before `doc:2` (83).

## Review Notes
- All score calculations across all examples were verified and are arithmetically correct.
- The syntax, availability version (Redis 6.2), and time complexity (O(N*K)+O(M*log(M))) are accurate per official Redis documentation.
- The comparison table between ZINTER, ZINTERSTORE, and ZINTERCARD is accurate.
- The WEIGHTS examples correctly demonstrate fractional weight scaling.

# Validation Summary: How to Use PFMERGE in Redis to Merge HyperLogLogs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (PFMERGE, PFADD, PFCOUNT commands)
- HyperLogLog probabilistic data structure
- Python (redis-py client library)

## Sources Consulted
- Redis official documentation for PFMERGE: https://redis.io/docs/latest/commands/pfmerge/
- Redis official documentation for PFCOUNT: https://redis.io/docs/latest/commands/pfcount/
- Redis official documentation for PFADD: https://redis.io/docs/latest/commands/pfadd/
- redis-py client library documentation: https://redis-py.readthedocs.io/
- Redis HyperLogLog internals documentation: https://redis.io/docs/latest/develop/data-types/probabilistic/hyperloglogs/

## Issues Found

1. **`build_monthly_rollup` hardcoded year and broken month formatting (line 91):** The f-string used `2026` instead of the `year` parameter and `0{month}` instead of `{month:02d}`. The `0{month}` format produces incorrect keys for months >= 10 (e.g., `010` instead of `10`). Fixed to `f"visitors:week:{year}-{month:02d}-{day:02d}"`.

2. **Incorrect Redis CLI output format in segmented example (line 131):** Comment showed `# (integer) ~7` but Redis CLI returns exact integers without a tilde prefix, e.g., `(integer) 7`. The tilde is misleading in the context of a redis-cli output comment. Fixed to `# (integer) 7`.

3. **"Merging Into Existing" example used wrong key (lines 138-140):** The example created `yesterday-visitors` via PFADD but never included it in the PFMERGE. Since `cumulative-visitors` did not exist prior to the PFMERGE call, the example failed to demonstrate "merging into an existing HyperLogLog" as the section title promises. Fixed by changing the first PFADD to populate `cumulative-visitors` directly, so the subsequent PFMERGE genuinely merges new data into an existing HLL.

## Review Notes
- The PFMERGE syntax shown requires at least one sourcekey, but the official Redis syntax makes sourcekeys optional (`PFMERGE destkey [sourcekey [sourcekey ...]]`). This is a minor simplification that doesn't affect practical usage.
- The `build_monthly_rollup` function uses a simplified assumption that week boundaries align to day 1, 8, 15, 22 of each month, which won't match real calendar weeks. This is a design simplification, not a bug per se, but readers building production rollup systems should use proper ISO week date calculations.
- The 0.81% standard error claim in the summary is accurate per Redis documentation.
- All Redis commands (PFADD, PFCOUNT, PFMERGE) are used correctly with valid syntax throughout the post.

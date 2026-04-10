# Validation Summary: How to Use TDIGEST.ADD in Redis T-Digest for Data Insertion

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisBloom module (T-Digest data structure)
- TDIGEST.ADD command
- TDIGEST.CREATE command
- TDIGEST.QUANTILE command
- TDIGEST.INFO command

## Sources Consulted
- Official Redis TDIGEST.ADD documentation: https://redis.io/docs/latest/commands/tdigest.add/
- Official Redis TDIGEST.CREATE documentation: https://redis.io/docs/latest/commands/tdigest.create/
- Official Redis TDIGEST.INFO documentation: https://redis.io/docs/latest/commands/tdigest.info/
- Official Redis TDIGEST.QUANTILE documentation: https://redis.io/docs/latest/commands/tdigest.quantile/

## Issues Found

### Issue 1: Incorrect auto-creation claim (Critical)
- **What was wrong:** The post stated that `TDIGEST.ADD` automatically creates a T-Digest with default compression if the key does not exist. This appeared in the syntax section, the "Auto-Creation Behavior" section, and the summary.
- **What was changed:** Updated the key parameter description to state the key must already exist. Rewrote the "Auto-Creation Behavior" section to "Key Must Exist", explaining that an error is returned if the key doesn't exist and that `TDIGEST.CREATE` must be called first. Updated the example to include `TDIGEST.CREATE`. Corrected the summary paragraph.
- **Why:** Per official Redis documentation, the `key` parameter is "The key name for an existing t-digest sketch" and an error is returned if "The given key does not exist." Auto-creation is not supported by `TDIGEST.ADD`.

### Issue 2: Incorrect TDIGEST.INFO output field numbering
- **What was wrong:** The example output showed `Observations` at position 7-8 and `Total compressions` at position 9-10.
- **What was changed:** Corrected to positions 13-14 and 15-16 respectively, and added the `Memory usage` field at positions 17-18 to better represent the actual output.
- **Why:** The TDIGEST.INFO response contains 9 name-value pairs (18 lines total): Compression, Capacity, Merged nodes, Unmerged nodes, Merged weight, Unmerged weight, Observations, Total compressions, and Memory usage. The blog had skipped intermediate fields with `...` but used incorrect line numbers after the ellipsis.

## Review Notes
- The `--` comment syntax used in Redis code blocks (e.g., `-- As requests come in`) is not valid Redis CLI syntax and would cause errors if copy-pasted directly. This is a common blog convention for explanatory inline comments but could confuse beginners. Consider using comments outside the code blocks or noting they are pseudo-comments.
- The TDIGEST.QUANTILE output in the "Query Percentiles After Insertion" example shows approximate values. Since T-Digest is a probabilistic data structure, exact output depends on implementation details and compression settings. The values shown are illustrative.
- The `response_ms` key is used across multiple examples. If run sequentially, the data from earlier examples would affect later results (e.g., the TDIGEST.INFO showing 14 observations may not account for values added in prior examples). This is minor since examples are typically understood as independent illustrations.

# Validation Summary: How to Use TDIGEST.CREATE in Redis T-Digest

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RedisBloom module
- T-Digest probabilistic data structure
- TDIGEST.CREATE, TDIGEST.ADD, TDIGEST.QUANTILE, TDIGEST.INFO commands

## Sources Consulted
- Official Redis documentation for TDIGEST.CREATE: https://redis.io/docs/latest/commands/tdigest.create/
- Official Redis documentation for TDIGEST.INFO: https://redis.io/docs/latest/commands/tdigest.info/
- Official Redis documentation for TDIGEST.ADD: https://redis.io/docs/latest/commands/tdigest.add/
- Official Redis documentation for TDIGEST.QUANTILE: https://redis.io/docs/latest/commands/tdigest.quantile/

## Issues Found
- **Memory comparison ratio was slightly off**: The post claimed T-Digest uses "700x less memory" than storing all values. The actual math is 4 MB / 6 KB = ~667x. Changed "700x" to "roughly 667x" for accuracy.

## Review Notes
- The claim "Returns an error if the key already exists" is standard RedisBloom behavior for CREATE-type commands, though the official TDIGEST.CREATE docs only explicitly list "incorrect key type" and "incorrect keyword" as error conditions. The claim is accurate in practice.
- The formula `COMPRESSION * 6 + 10` for maximum centroids is not documented in official Redis docs but matches the observed Capacity of 610 for default compression 100 (100 * 6 + 10 = 610). The post correctly qualifies this as "approximately."
- The TDIGEST.INFO example output includes all 9 fields (Compression, Capacity, Merged nodes, Unmerged nodes, Merged weight, Unmerged weight, Observations, Total compressions, Memory usage) and matches the official documentation format.
- All command syntax (TDIGEST.CREATE, TDIGEST.ADD, TDIGEST.QUANTILE) verified correct against official docs.
- The accuracy vs memory trade-off table uses approximate values that are reasonable given the TDIGEST.INFO example showing 5520 bytes for an empty default-compression sketch.

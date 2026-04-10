# Validation Summary: How to Use TDIGEST.INFO in Redis T-Digest

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis Stack (RedisBloom module)
- T-Digest probabilistic data structure
- TDIGEST.INFO command
- TDIGEST.CREATE command
- TDIGEST.ADD command

## Sources Consulted
- Redis official documentation for TDIGEST.INFO: https://redis.io/docs/latest/commands/tdigest.info/
- Redis official documentation for TDIGEST.CREATE: https://redis.io/docs/latest/commands/tdigest.create/
- RedisBloom t-digest-c source code (capacity formula): https://github.com/RedisBloom/t-digest-c
- RedisBloom module source code: https://github.com/RedisBloom/RedisBloom/blob/master/src/rm_tdigest.c

## Issues Found

1. **Incorrect intro claim about trimming**: The introduction stated TDIGEST.INFO shows "whether the sketch has been trimmed." No such field exists in the output. Removed the claim.

2. **Wrong capacity for COMPRESSION 50**: Blog stated ~306, but the formula is `6 * compression + 10`, giving `6 * 50 + 10 = 310`. Fixed to 310.

3. **Wrong capacity for COMPRESSION 500**: Blog stated ~3060 (in two places), but `6 * 500 + 10 = 3010`. Fixed to 3010.

4. **Incorrect merge state after adding 10 values**: Blog showed `Merged nodes: 10`, `Unmerged nodes: 0`, `Total compressions: 1`. This is wrong — compression only triggers when `merged_nodes + unmerged_nodes >= cap - 1` (609 for cap=610). With only 10 values added, they remain as unmerged nodes. Fixed to `Merged nodes: 0`, `Unmerged nodes: 10`, `Total compressions: 0`. This matches the behavior shown in the official Redis documentation examples.

5. **Weight fields shown as string type instead of integer**: Blog showed Merged weight and Unmerged weight as string values (e.g., `"10"`, `"0"`). The official documentation shows these as `(integer)` type. Fixed all weight values to use `(integer)` format.

6. **Incorrect memory usage values**: Blog showed 5040 bytes for a new sketch and 5248 after adding values. The official Redis documentation shows ~9768 bytes for a sketch with default compression (cap=610). The memory formula from source code is `sizeof(td_histogram_t) + sizeof(double) * cap + sizeof(long long) * cap`, which is capacity-based and does not change when values are added. Fixed both values to 9768.

## Review Notes
- The exact memory usage value (9768) comes from official Redis documentation and may vary slightly across Redis Stack versions due to struct layout changes.
- The capacity formula `6 * compression + 10` is confirmed in the RedisBloom t-digest-c source code and is consistent across current versions.
- The command syntax, field names, default compression value (100), and general explanations about compression/accuracy trade-offs are all accurate.
- The use case examples (diagnosing accuracy, capacity planning, verifying ingestion, understanding merge behavior) are conceptually sound and helpful.

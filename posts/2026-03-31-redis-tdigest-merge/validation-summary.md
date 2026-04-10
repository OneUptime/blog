# Validation Summary: How to Use TDIGEST.MERGE in Redis to Combine T-Digests

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis (T-Digest probabilistic data structure)
- TDIGEST.MERGE command
- TDIGEST.CREATE, TDIGEST.ADD, TDIGEST.QUANTILE, TDIGEST.INFO commands

## Sources Consulted
- Official Redis TDIGEST.MERGE documentation: https://redis.io/docs/latest/commands/tdigest.merge/
- Official Redis TDIGEST.CREATE documentation: https://redis.io/docs/latest/commands/tdigest.create/
- Official Redis TDIGEST.ADD documentation: https://redis.io/docs/latest/commands/tdigest.add/
- Official Redis TDIGEST.QUANTILE documentation: https://redis.io/docs/latest/commands/tdigest.quantile/
- Official Redis TDIGEST.INFO documentation: https://redis.io/docs/latest/commands/tdigest.info/
- Redis T-Digest overview: https://redis.io/docs/latest/develop/data-types/probabilistic/t-digest/

## Issues Found
1. **Incorrect time complexity**: The post stated "Merge is O(N log N) where N is the total number of centroids across all sources." The official Redis documentation specifies the complexity as O(N*K), where N is the number of centroids and K is the number of input sketches. Fixed to match official documentation.

## Review Notes
- The command syntax, parameters (`numkeys`, `COMPRESSION`, `OVERRIDE`), and their descriptions are all accurate per official documentation.
- The default accumulate behavior and OVERRIDE semantics are correctly described.
- All code examples use correct syntax for TDIGEST.CREATE, TDIGEST.ADD, TDIGEST.QUANTILE, and TDIGEST.INFO.
- The output examples are simplified (e.g., showing only relevant output rather than all command responses), which is standard blog convention.
- The TDIGEST.INFO output example shows only the Compression field rather than the full output (which includes Capacity, Merged nodes, Unmerged nodes, etc.), but this is acceptable as it highlights the relevant field for the example.
- The claim that "source sketches are not modified by the merge" is not explicitly stated in the official docs but is consistent with standard merge semantics and how Redis merge commands work (only the destination key is written to).

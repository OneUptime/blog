# Validation Summary: How to Estimate Redis Memory for Lists Workload

## Status
validated

## Post Type
Tutorial / Capacity Planning Guide

## Technologies Covered
- Redis (quicklist encoding, list data structure)
- Redis CLI (`CONFIG GET`, `CONFIG SET`, `RPUSH`, `LLEN`, `MEMORY USAGE`, `OBJECT ENCODING`, `--scan`)
- Python (memory estimation script)
- Bash (monitoring script)

## Sources Consulted
- Redis official documentation on list encoding and `list-max-listpack-size` configuration: https://redis.io/docs/latest/develop/reference/clients/
- Redis default configuration file (`redis.conf`) comments for `list-max-listpack-size` (default: -2, meaning 8 KB per node)
- Redis source code for quicklist struct (`quicklist.h`) and quicklistNode struct layout
- Redis documentation on `MEMORY USAGE` command: https://redis.io/docs/latest/commands/memory-usage/
- Redis documentation on listpack/ziplist entry encoding overhead

## Issues Found

### Issue 1 (Critical): Incorrect default value for `list-max-listpack-size`
- **What was wrong:** The post stated the default value of `list-max-listpack-size` is `128` (element count), claiming each quicklist node holds up to 128 elements by default. The actual default is `-2`, which sets an 8 KB size limit per node. Negative values (`-1` through `-5`) specify size limits (4 KB to 64 KB); only positive values specify element counts. The value 128 has never been the default for this configuration — the author likely confused it with `hash-max-listpack-entries` or `set-max-listpack-entries`.
- **What was changed:** Corrected the CONFIG GET output to show `-2`, rewrote the default explanation to describe both negative (size-based) and positive (count-based) modes, and updated all downstream calculations (node counts, memory estimates, Python example) to use the correct effective node capacity derived from the 8 KB size limit.
- **Why:** This error propagated through the entire post — the example calculations, Python script output, node size comparison section, and summary all referenced the incorrect default.

### Issue 2 (Minor): Incorrect Python script output comment
- **What was wrong:** The example output comment showed `total_mb: 197.3`, but the actual computation (`20700 * 10000 / 1024 / 1024`) yields `197.4` when rounded to 1 decimal place. This was corrected as part of the broader recalculation with the fixed node capacity.
- **What was changed:** Updated the example call to pass the correct `node_capacity=199` (derived from `floor(8192 / (11 + 30))`), and updated the output comment to reflect the recalculated values: `num_nodes_per_list: 3`, `bytes_per_list: 20668`, `total_mb: 197.1`, `total_gb: 0.192`.

## Review Notes
- The overhead approximations (~72 bytes base per list, ~32 bytes per quicklist node, ~11 bytes per listpack entry) are reasonable estimates for a capacity planning guide. Actual overhead varies slightly depending on Redis version, key name length, and allocator behavior. The post correctly advises validating against `MEMORY USAGE` on real data.
- The monitoring bash script using `--scan` is correct and production-safe (avoids `KEYS`), though for very large keyspaces it will be slow due to one `TYPE`, `LLEN`, and `MEMORY USAGE` call per key.
- The Python estimation function is well-structured and flexible — it accepts `node_capacity` as a parameter, allowing users to adapt it for different `list-max-listpack-size` configurations.
- The recommendation to consider Streams for append-only workloads with long lists is sound general advice.

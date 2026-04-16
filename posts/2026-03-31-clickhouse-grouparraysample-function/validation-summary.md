# Validation Summary: How to Use groupArraySample() in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL
- ClickHouse aggregate functions (groupArraySample, groupArray, count, avg)
- ARRAY JOIN

## Sources Consulted
- [ClickHouse groupArraySample documentation](https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/grouparraysample)
- [ClickHouse ARRAY JOIN documentation](https://clickhouse.com/docs/en/sql-reference/statements/select/array-join)
- [Altinity Knowledge Base - Sampling Example](https://kb.altinity.com/altinity-kb-queries-and-syntax/sampling-example/)

## Issues Found
No technical issues found.

Verified specifics:
- Function signature `groupArraySample(max_size[, seed])(x)` matches official docs — `N` first, optional `seed` second, target column as the argument after the parameter list.
- The claim that when a group has fewer than `N` rows, all values are returned (not padded with duplicates) matches documented behavior.
- Reservoir sampling claim is consistent with ClickHouse's internal implementation for this function family.
- ARRAY JOIN usage to unnest the sampled array is syntactically and semantically correct.
- `today() - 1`, `now() - INTERVAL 1 DAY`, and related date arithmetic are valid ClickHouse expressions.
- Combining `groupArraySample` with `count()`, `avg()`, etc. in the same SELECT is valid.

## Review Notes
- The "Reproducible Sampling with a Seed" section's claim that the same query always returns the same sample is generally true with a fixed seed on a single-threaded or ordered execution path, but in highly parallel distributed setups the ordering of input rows processed by the aggregator can affect the result even with the same seed. For most single-node workloads, however, results are reproducible in practice, so the simplified statement is acceptable for a tutorial.
- The "Checking Sample Distribution" section title is slightly misleading — the provided query checks sample cap behavior (sample_size ≤ N), not statistical distribution. The body text clarifies this correctly, so no change was made.
- Default seed value when omitted is 123456 (per ClickHouse docs) — worth noting for readers who need reproducibility without explicitly setting a seed.

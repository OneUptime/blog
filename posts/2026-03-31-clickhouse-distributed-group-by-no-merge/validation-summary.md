# Validation Summary: How to Use distributed_group_by_no_merge Setting in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- Distributed tables
- Distributed query execution
- GROUP BY aggregation
- system.query_log

## Sources Consulted
- ClickHouse `Settings.cpp` source of truth (authoritative setting declaration and docstring): https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/src/Core/Settings.cpp
- ClickHouse Settings reference: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse `SELECT ... GROUP BY` reference: https://clickhouse.com/docs/en/sql-reference/statements/select/group-by

## Issues Found
1. **Incorrect description of value `2`.** The post originally said value `2` means "Do not merge but mark result as complete (for use with subqueries)". Per the ClickHouse source docstring for `distributed_group_by_no_merge`, value `2` actually means: same as `1`, but `ORDER BY` and `LIMIT` are applied on the initiator (useful when the query has `ORDER BY`/`LIMIT` that must be applied globally). Corrected the "Available Values" block to reflect this.
2. **Misleading example for value `2`.** The original SQL example framed value `2` as a subquery workaround, which does not match the setting's actual semantics. Replaced with an example showing `ORDER BY` + `LIMIT` applied on the initiator — the documented use case.
3. **Misleading sentence in Summary.** Original text read "Use value `2` inside subqueries to avoid compatibility issues with outer query planning." Rewrote to: "Use value `2` when the query has `ORDER BY` or `LIMIT` that must be applied globally on the initiator."
4. **Tightened value `0` and `1` descriptions** in the "Available Values" block to align with the official docstring wording ("final query processing is done on the initiator node" for `0`; "query is completely processed on the shard, initiator only proxies the data" for `1`).

## Review Notes
- The opening paragraphs describe the behavior of value `1` as returning "raw partial aggregation results from each shard". Strictly, with `distributed_group_by_no_merge = 1`, each shard *completely* processes the GROUP BY for its own data and the initiator proxies those per-shard results without merging. "Partial" is acceptable in the sense of "partial with respect to the full dataset", but a future revision could phrase this more precisely.
- The "Caveats" section correctly warns that using value `1` when data is not sharded by the GROUP BY key produces incorrect results — this matches the official guidance ("you can use this in case it is for certain that there are different keys on different shards").
- SQL example syntax (`SET`, `SETTINGS`, `system.query_log` columns `query_duration_ms`, `read_rows`, `memory_usage`) was verified and is correct.
- No version-specific caveats: the setting has existed and behaved this way for many ClickHouse releases.

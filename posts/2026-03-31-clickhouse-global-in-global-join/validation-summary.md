# Validation Summary: How to Use GLOBAL IN and GLOBAL JOIN in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (Distributed table engine)
- SQL: `GLOBAL IN`, `GLOBAL JOIN`
- ClickHouse EXPLAIN plan

## Sources Consulted
- ClickHouse `IN` operator docs: https://clickhouse.com/docs/sql-reference/operators/in (distributed subqueries, GLOBAL keyword semantics)
- ClickHouse `JOIN` statement docs: https://clickhouse.com/docs/sql-reference/statements/select/join (GLOBAL JOIN, default INNER when type omitted, temporary-table transfer)
- ClickHouse `EXPLAIN` docs: https://clickhouse.com/docs/sql-reference/statements/explain (plan operator names: `CreatingSets`, `CreatingSet`, `ReadFromRemote`, `ReadFromMergeTree`)

## Issues Found
1. **GLOBAL JOIN mechanism wording (inaccurate)** — The post stated the initiator "sends them as a hash table to every shard. Each shard probes the hash table locally." Per the ClickHouse JOIN docs, the initiator actually ships a **temporary table of rows**, and each remote shard builds its own hash table locally from that temporary data. Changed to: "sends them as a temporary table to every shard. Each shard builds its own hash table from the temporary data and probes it locally."

2. **EXPLAIN operator name fabricated** — The post told readers to look for `ReadFromStorage (Global)` in EXPLAIN output, which is not a real ClickHouse plan-step name. The correct operators are `CreatingSets` (with a `CreatingSet` child building the set from the subquery) and `ReadFromRemote` (the distributed main query). Updated the sentence to reference `CreatingSets` / `CreatingSet` and `ReadFromRemote` instead.

## Review Notes
- `GLOBAL JOIN` without an explicit join type is valid and defaults to `INNER JOIN` per the ClickHouse grammar — the code example is fine as written.
- The description of plain-`IN`-on-distributed-table behavior (each shard rewrites the subquery to hit only its local table, producing incomplete results when the right-hand side is also Distributed) matches the official docs.
- Memory guidance ("a few GB") is a reasonable rule of thumb; in practice the hard ceiling is governed by `max_memory_usage` / `max_rows_in_set` / `max_bytes_in_set`, but listing those was out of scope for the post.
- The post could optionally mention the `prefer_global_in_and_join` setting (which automatically rewrites `IN`/`JOIN` on Distributed tables to their `GLOBAL` variants) for readers who want automatic behavior, but this is an enhancement, not a correction.

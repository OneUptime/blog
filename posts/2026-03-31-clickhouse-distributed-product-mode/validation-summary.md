# Validation Summary: How to Set distributed_product_mode in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (Distributed table engine)
- ClickHouse settings: `distributed_product_mode`
- ReplicatedMergeTree engine
- SQL: `GLOBAL IN`, `GLOBAL JOIN`
- Mermaid (diagram)

## Sources Consulted
- [ClickHouse Session Settings — distributed_product_mode](https://clickhouse.com/docs/operations/settings/settings)
- [ClickHouse IN Operators (GLOBAL IN behavior)](https://clickhouse.com/docs/en/sql-reference/operators/in)
- [ClickHouse Distributed table engine docs](https://clickhouse.com/docs/en/engines/table-engines/special/distributed)
- [ClickHouse error codes — DISTRIBUTED_IN_JOIN_SUBQUERY_DENIED (288)](https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/ErrorCodes.cpp)
- [ClickHouse distributed_product_mode = 'deny' exception thread](https://groups.google.com/g/clickhouse/c/11OceYDtPVI)

## Issues Found
No technical issues found.

Verifications performed:
- Default value of `distributed_product_mode` is `deny` — confirmed.
- Four valid values (`deny`, `local`, `global`, `allow`) and their behaviors — confirmed.
- Exception text "Double-distributed IN/JOIN subqueries is denied" and error code 288 (`DISTRIBUTED_IN_JOIN_SUBQUERY_DENIED`) — confirmed.
- `Distributed('cluster', database, table, sharding_key)` engine syntax — correct.
- `ReplicatedMergeTree('/clickhouse/tables/{shard}/...', '{replica}')` macro usage — correct conventional pattern.
- `ON CLUSTER` syntax for distributed DDL — correct.
- `GLOBAL IN` and `GLOBAL JOIN` syntax examples — correct and idiomatic.
- Description of `local` mode rewriting subquery to use local table on each shard — correct.
- Description of `global` mode collecting result on the initiator and broadcasting — correct, matches the documented behavior of `GLOBAL IN`.

## Review Notes
- The post correctly emphasizes that `local` mode is only safe when both tables are co-sharded on the same key. This is an important nuance often missed.
- The recommendation in the table for "Large subquery result (> 1M rows)" suggesting `JOIN` with `GLOBAL JOIN` is a reasonable rule of thumb but is somewhat heuristic — at very large sizes, `GLOBAL JOIN` itself can be expensive because the right-hand result is broadcast to all shards. A more advanced approach in such cases is often a co-sharded local join or an external dictionary, but the existing advice is not technically wrong for the common case.
- The recommendation to prefer explicit `GLOBAL IN` / `GLOBAL JOIN` over relying on the session setting is widely shared best-practice in the ClickHouse community.
- Minor stylistic note (not changed): the `CREATE TABLE orders AS orders_local ENGINE = Distributed(...)` does not include `ON CLUSTER`. Distributed table definitions are sometimes also created `ON CLUSTER` so they exist on every node; the example is still valid for a setup where the Distributed table only exists on the initiator.

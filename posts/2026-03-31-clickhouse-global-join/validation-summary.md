# Validation Summary: How to Use GLOBAL JOIN in ClickHouse Distributed Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL
- Distributed tables
- GLOBAL JOIN / GLOBAL IN

## Sources Consulted
- ClickHouse IN operators documentation: https://clickhouse.com/docs/en/sql-reference/operators/in
- ClickHouse JOIN documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse settings reference for `max_bytes_in_join`, `distributed_product_mode`

## Issues Found
No technical issues found.

All technical claims verified against official ClickHouse documentation:
- The explanation of GLOBAL JOIN semantics (right-side query runs once on the initiator, results are put into a temporary table, then broadcast to all shards) matches the official documentation.
- The JOIN syntax `[GLOBAL] [INNER|LEFT|RIGHT|FULL|CROSS] [OUTER|SEMI|ANTI|ANY|ALL|ASOF] JOIN` is correct; `GLOBAL` is an optional prefix on any JOIN type.
- Examples of `GLOBAL INNER JOIN`, `GLOBAL LEFT JOIN`, `GLOBAL ANY LEFT JOIN`, and `GLOBAL LEFT SEMI JOIN` are syntactically valid.
- `max_bytes_in_join` is a valid setting that limits the hash table size during JOIN operations.
- The `GLOBAL IN` equivalence with `GLOBAL LEFT SEMI JOIN` is conceptually sound for deduplicated-match filtering.
- Memory and network considerations (initiator holds result, broadcasts once) match documented behavior.

## Review Notes
- The post's statement that "without GLOBAL, the right-side subquery runs on each shard independently" is conceptually correct, but in practice the exact behavior depends on the `distributed_product_mode` setting (default `deny` will error out on distributed-to-distributed joins; `local`, `global`, and `allow` produce different behaviors). This is a minor caveat not called out in the post, but the post's framing as a conceptual explanation is still accurate.
- Code examples are clear and idiomatic.
- The post could in the future mention `distributed_product_mode = 'global'` as an option to auto-rewrite joins, but this is an enhancement, not a correction.

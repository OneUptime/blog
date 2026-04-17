# Validation Summary: How to Freeze and Unfreeze Partitions in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (MergeTree engine)
- ClickHouse DDL: `ALTER TABLE ... FREEZE PARTITION`, `ALTER TABLE ... UNFREEZE`, `ALTER TABLE ... ATTACH PARTITION`
- Shadow directory / hard-link-based backups
- rsync, cp (shell tooling for backup transfer)
- ON CLUSTER distributed DDL
- clickhouse-backup (mentioned as higher-level tool)

## Sources Consulted
- [ClickHouse Docs — ALTER TABLE ... PARTITION (FREEZE / UNFREEZE syntax, ON CLUSTER, shadow path)](https://clickhouse.com/docs/sql-reference/statements/alter/partition)
- [ClickHouse Docs — system.parts (is_frozen column)](https://clickhouse.com/docs/operations/system-tables/parts)
- [ClickHouse Docs — ATTACH PARTITION / detached directory semantics](https://clickhouse.com/docs/sql-reference/statements/alter/partition#attach-partitionpart)

## Issues Found
No technical issues found.

Spot-checks performed:
- `ALTER TABLE ... FREEZE [PARTITION expr] [WITH NAME 'name']` syntax matches the official grammar.
- `ALTER TABLE ... UNFREEZE [PARTITION 'expr'] WITH NAME 'name'` form (without PARTITION) is valid per docs; `PARTITION` is optional.
- Shadow path `/var/lib/clickhouse/shadow/<N_or_name>/data/<database>/<table>/` is the documented layout.
- `ON CLUSTER` is supported for both FREEZE and UNFREEZE — the example is valid.
- Hard-link semantics (shared inode, space reclaimed only when all links removed) are accurate.
- Restore flow (copy parts to `detached/`, then `ATTACH PARTITION`) with checksum verification on attach matches documented behavior.
- Partition literal forms (`'2024-01'` vs `202401`) are both valid depending on the `PARTITION BY` expression; the `sales` example correctly uses integer form for `toYYYYMM(...)`.

## Review Notes
- The post states "ClickHouse does not currently expose frozen snapshots through a system table." This remains broadly accurate in the sense that there is no table listing shadow backup names; however, `system.parts` does include an `is_frozen` flag indicating whether at least one frozen snapshot references a part. This is a nuance rather than an error, so it was left unchanged.
- FREEZE taking a "brief lock on the partition" is a reasonable simplification; the actual mechanism is a short-lived internal lock to obtain a consistent view of active parts before hard-linking.
- The post's recommendation to run FREEZE per replica (or via `ON CLUSTER`) is correct because replicas each hold their own on-disk parts; snapshots are not automatically consolidated across replicas.
- For production users, the pointer to `clickhouse-backup` is appropriate since metadata (schema DDL) is not captured by FREEZE alone.

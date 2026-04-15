# Validation Summary: How to Use ReplicatedVersionedCollapsingMergeTree in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ReplicatedVersionedCollapsingMergeTree engine
- VersionedCollapsingMergeTree engine
- CollapsingMergeTree engine (comparison)
- ZooKeeper / ClickHouse Keeper

## Sources Consulted
- ClickHouse VersionedCollapsingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/versionedcollapsingmergetree
- ClickHouse Replication documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- ClickHouse system.replicas documentation: https://clickhouse.com/docs/en/operations/system-tables/replicas
- ClickHouse configuration files documentation (XML root tag conventions)

## Issues Found
1. **Deprecated `<yandex>` XML root tag**: The macros configuration snippet used `<yandex>` as the root element, which is a legacy tag from before the Yandex-to-ClickHouse rename. Changed to `<clickhouse>`, which is the current recommended root element.
2. **Incorrect version column type constraint**: The introduction stated the version column accepts "any unsigned integer type." Per official documentation, the version column also accepts signed integer types (`Int*`) and date/time types (`Date`, `Date32`, `DateTime`, `DateTime64`). Updated the text to list all accepted types.

## Review Notes
- All SQL syntax (CREATE TABLE, INSERT, SELECT with sign multiplication, OPTIMIZE TABLE, FINAL) is correct.
- The engine constructor parameter order (ZooKeeper path, replica name, sign column, version column) is correct.
- The collapsing behavior description (same ORDER BY key + same version + opposite signs) is accurate.
- The `system.replicas` query uses valid column names (`replica_name`, `is_leader`, `absolute_delay`, `queue_size`).
- The comparison table between CollapsingMergeTree and VersionedCollapsingMergeTree is accurate — CollapsingMergeTree does require strict insertion order while VersionedCollapsingMergeTree handles out-of-order inserts via version matching.
- The `argMax(status, version)` pattern in the fulfillment example works correctly for the given data. Note that this pattern assumes the highest-version row with sign=+1 is always the latest active state, which holds as long as versions are managed correctly.
- The `HAVING net_items > 0` filter correctly excludes fully cancelled/deleted records from results.

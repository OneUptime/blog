# Validation Summary: What Is TTL in ClickHouse and How Data Lifecycle Works

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- TTL (Time To Live) for row-level, column-level, and table-level data expiry
- ClickHouse storage tiering (multi-disk/volume policies)
- ClickHouse configuration (config.xml storage_configuration, merge_tree settings)

## Sources Consulted
- ClickHouse MergeTree TTL documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse MergeTree settings documentation: https://clickhouse.com/docs/en/operations/settings/merge-tree-settings
- ClickHouse multiple volumes / storage policies: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-multiple-volumes

## Issues Found

1. **Incorrect terminology: "Partition-Level TTL"** — ClickHouse does not have a "partition-level TTL" concept. The section described standard table-level TTL with DELETE and TO DISK actions, which is the same mechanism as row-level TTL but with different actions. The claim that it "operates on part directories rather than scanning individual rows" was inaccurate for DELETE actions, which still evaluate rows during merges. Renamed the section to "Table-Level TTL with Actions" and corrected the explanation.

2. **`merge_with_ttl_timeout` XML configuration missing `<merge_tree>` wrapper** — The original snippet showed `<merge_with_ttl_timeout>` as a top-level element in config.xml. This setting must be nested inside a `<merge_tree>` block in config.xml (or set as a per-table SETTINGS value). Added the required `<merge_tree>` wrapper element.

3. **Summary used incorrect "partition level" terminology** — Updated the summary paragraph to use "table level" instead of "partition level", and corrected `MOVE TO DISK` to `TO DISK` / `TO VOLUME` to match the actual ClickHouse TTL action syntax.

## Review Notes
- The section heading "Storage Tiering with MOVE TO DISK" uses "MOVE TO DISK" phrasing while the actual TTL syntax is `TO DISK` or `TO VOLUME`. `MOVE TO DISK` is a different command used with `ALTER TABLE ... MOVE PART|PARTITION`. The heading is not strictly a code example so it was left as-is, but could be clarified in a future revision.
- The `system.tables.engine_full` column does contain TTL information, so the "Checking TTL Configuration" query is valid. However, `engine_full` shows the full engine declaration string which may be truncated for complex configurations. An alternative approach is to query `SELECT name, engine_full FROM system.tables WHERE has(TTLs, ...)` or inspect `system.parts` for TTL-related metadata.
- All SQL syntax (CREATE TABLE with TTL, column-level TTL, ALTER TABLE MODIFY TTL, ALTER TABLE MATERIALIZE TTL, TO DISK, TO VOLUME) was verified as correct against official ClickHouse documentation.
- The storage_configuration XML structure with disks/policies/volumes hierarchy is correct.

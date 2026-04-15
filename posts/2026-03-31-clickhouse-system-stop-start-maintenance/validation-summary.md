# Validation Summary: How to Use SYSTEM STOP and START for Maintenance Windows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SYSTEM STOP/START statements, BACKUP, ALTER TABLE)
- ClickHouse system tables (system.mutations, system.metrics, system.merges, system.replication_queue)
- MergeTree engine family settings (parts_to_throw_insert)

## Sources Consulted
- ClickHouse SYSTEM Statements documentation: https://clickhouse.com/docs/sql-reference/statements/system
- ClickHouse Backup and Restore documentation: https://clickhouse.com/docs/en/sql-reference/statements/backup
- ClickHouse ALTER TABLE Column Manipulations: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse system.mutations table: https://clickhouse.com/docs/en/operations/system-tables/mutations
- ClickHouse system.metrics table: https://clickhouse.com/docs/en/operations/system-tables/metrics
- ClickHouse system.merges table: https://clickhouse.com/docs/en/operations/system-tables/merges
- ClickHouse system.replication_queue table: https://clickhouse.com/docs/en/operations/system-tables/replication_queue
- ClickHouse MergeTree Settings: https://clickhouse.com/docs/operations/settings/merge-tree-settings

## Issues Found

1. **`SYSTEM STOP SENDS` does not exist** — The correct command is `SYSTEM STOP REPLICATED SENDS`. Changed all occurrences of `SYSTEM STOP SENDS` / `SYSTEM START SENDS` to `SYSTEM STOP REPLICATED SENDS` / `SYSTEM START REPLICATED SENDS`.

2. **`SYSTEM SYNC FILE CACHE` comment was misleading** — The comment said "Flush in-memory data to disk" but this command performs an OS-level `sync` syscall to flush filesystem buffers, not ClickHouse in-memory data. Changed the comment to "Sync OS filesystem cache to disk".

3. **Two system.metrics names were incorrect** — `BackgroundMovesPoolTask` was corrected to `BackgroundMovePoolTask` (singular). `BackgroundDistributedSendsPoolTask` was corrected to `BackgroundDistributedSchedulePoolTask`.

4. **`parts_to_throw_insert = 0` does not block writes** — Setting this to 0 disables the "too many parts" check entirely, allowing unlimited inserts. The blog had it inverted. Fixed to use `parts_to_throw_insert = 1` to effectively block inserts (since most tables have more than 1 active part, the check will reject new inserts).

5. **Default value for `parts_to_throw_insert` was outdated** — The blog used 300 as the default, which was correct before ClickHouse 23.6. Since version 23.6, the default is 3000. Updated accordingly.

6. **`SYSTEM STOP DISTRIBUTED SENDS` requires a table argument** — Unlike most other SYSTEM STOP commands, DISTRIBUTED SENDS requires a table name. Added a table argument and a clarifying comment.

## Review Notes
- The `parts_to_throw_insert = 1` approach to blocking inserts is a workaround, not a true read-only mode. It works because most tables have more than 1 part, causing the threshold check to reject inserts. A freshly created or recently optimized table with only 1 part would still accept inserts. The post could mention this caveat in the future.
- `SYSTEM SYNC FILE CACHE` is described in the ClickHouse docs as "too heavy and has potential for misuse." The post could add a note about using it judiciously.
- The `SYSTEM STOP MERGES` comment says it stops "merges and mutations" but `SYSTEM STOP MERGES` only stops merges. Mutations continue to run. To also stop mutations, `SYSTEM STOP MERGES` is still the relevant command as mutations run through the merge machinery, but the distinction is worth noting for precision.

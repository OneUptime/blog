# Validation Summary: How to Move Tables Between Disks in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ALTER TABLE MOVE PARTITION / MOVE PART
- ClickHouse storage policies, disks, and volumes
- system.parts, system.moves system tables
- ALTER TABLE FREEZE / UNFREEZE (backup and migration)
- clickhouse-client CLI

## Sources Consulted
- ClickHouse ALTER TABLE partition/part manipulation docs: https://clickhouse.com/docs/sql-reference/statements/alter/partition
- ClickHouse system.merges table docs: https://clickhouse.com/docs/operations/system-tables/merges
- ClickHouse system.moves table docs: https://clickhouse.com/docs/operations/system-tables/moves
- ClickHouse system.parts table docs: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse system.part_log table docs: https://clickhouse.com/docs/operations/system-tables/part_log
- ClickHouse MergeTree engine docs (storage policies): https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse ALTER TABLE settings docs: https://clickhouse.com/docs/sql-reference/statements/alter/setting
- ClickHouse alternative backup methods: https://clickhouse.com/docs/operations/backup/alternative_methods

## Issues Found

### 1. Incorrect system table for monitoring move progress (Checking Move Progress section)
- **What was wrong:** The post queried `system.merges` with `WHERE merge_type = 'MOVE_PART'` to monitor ongoing moves. Move operations are not tracked in `system.merges` — ClickHouse uses the dedicated `system.moves` table for in-progress move operations. The value `'MOVE_PART'` is not a valid `merge_type` in `system.merges`, so the query would always return zero rows.
- **What was changed:** Replaced the query with one that reads from `system.moves`, selecting the correct columns: `database`, `table`, `part_name`, `target_disk_name`, `elapsed`, and `part_size`.
- **Why:** `system.moves` is the correct system table for tracking in-progress data part moves between disks/volumes.

### 2. Incorrect server migration workflow (Moving a Table to a New Server section)
- **What was wrong:** The post rsynced frozen data to the `shadow/` directory on the new server and then ran `ALTER TABLE events ATTACH PARTITION ALL`. This workflow does not work because: (a) `ATTACH` reads from the table's `detached/` directory, not from `shadow/`; (b) `ATTACH PARTITION ALL` without `FROM` is not the documented pattern for restoring from frozen backups.
- **What was changed:** Updated the rsync target to the table's `detached/` directory, changed `ATTACH PARTITION ALL` to `ATTACH PARTITION '202601'` (individual partition attach), and added a note explaining that frozen data must be copied to `detached/` before attaching.
- **Why:** The ClickHouse documentation for FREEZE/restore explicitly requires copying data from the shadow directory into the target table's `detached/` directory before running ATTACH.

### 3. Missing storage_policy superset restriction (Changing the Default Storage Policy section)
- **What was wrong:** The post showed `ALTER TABLE events MODIFY SETTING storage_policy = 'cold_only'` without mentioning that the new policy must include all disks and volumes from the previous policy. This is a documented restriction — ClickHouse will reject the change if the new policy removes any disks or volumes that were in the old policy.
- **What was changed:** Added a sentence explaining the superset constraint: "The new policy must include all disks and volumes from the previous policy (with the same names). You can add new disks or volumes, but you cannot remove existing ones."
- **Why:** Without this warning, readers may encounter confusing errors when attempting to switch to a policy that does not include all original disks/volumes.

## Review Notes
- The summary section referenced `system.merges` for monitoring moves; this was corrected to `system.moves` to match the fix in the body.
- The FREEZE/ATTACH workflow in the post uses placeholder paths (`<shard>`, `<table>`, `<database>`) since the exact shadow directory structure depends on the ClickHouse storage layout. Readers will need to inspect their own shadow directory structure to find the correct paths.
- All SQL syntax for MOVE PARTITION, MOVE PART, FREEZE, UNFREEZE, and system table queries was verified as correct against official documentation.

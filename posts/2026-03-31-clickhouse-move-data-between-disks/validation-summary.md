# Validation Summary: How to Move Data Between Disks in ClickHouse

## Status
validated

## Post Type
Tutorial / Administration Guide

## Technologies Covered
- ClickHouse (MergeTree engine, storage configuration, ALTER TABLE operations)
- ClickHouse storage policies and multi-disk configuration
- ClickHouse TTL rules for automatic data movement
- ClickHouse system.parts table for monitoring

## Sources Consulted
- ClickHouse MergeTree documentation — multiple volumes and storage policies: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-multiple-volumes
- ClickHouse ALTER TABLE PARTITION documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse MergeTree TTL documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse system.parts reference: https://clickhouse.com/docs/en/operations/system-tables/parts
- ClickHouse storage configuration reference: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-multiple-volumes_configure

## Issues Found

1. **move_factor moves largest parts, not oldest** (line 168): The post claimed that when `move_factor` triggers, ClickHouse moves "the oldest parts." According to the official documentation, ClickHouse sorts existing parts by size in descending order and moves the largest parts first, not the oldest. Changed "oldest" to "largest."

2. **Incorrect hard-link claim during moves** (line 201): The post stated "ClickHouse copies the part to the destination disk and hard-links metadata." ClickHouse documentation explicitly states that hard links between different disks are not supported. Since the entire purpose of MOVE is to transfer between different disks, hard-linking is not possible. Removed the hard-link claim.

3. **Missing storage policy restriction** (line 207): The post showed `ALTER TABLE ... MODIFY SETTING storage_policy = 'new_policy'` without mentioning that the new policy must contain all disks and volumes from the old policy with the same names. This is a critical restriction documented in the official docs. Added this requirement to the text and the SQL comment.

## Review Notes
- The `MATERIALIZE TTL` description ("trigger TTL moves without a full merge") is technically correct — it avoids a full MergeTree merge — but it is implemented as a mutation that still rewrites affected parts, so it is not a lightweight operation. The current phrasing is acceptable but could be more precise in a future revision.
- All SQL syntax, XML configuration, system table column names, and function usage (toYYYYMM, formatReadableSize, currentDatabase, LowCardinality) were verified as correct.
- The default value of `move_factor` is 0.1, which the post correctly demonstrates.

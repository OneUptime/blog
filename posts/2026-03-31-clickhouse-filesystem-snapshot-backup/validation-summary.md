# Validation Summary: How to Use Filesystem Snapshots for ClickHouse Backups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SYSTEM commands, ALTER TABLE FREEZE/UNFREEZE, system.parts)
- LVM (Logical Volume Manager) — `lvcreate`, `lvremove`
- Linux filesystem tools — `sync`, `mount`, `umount`, `rsync`
- AWS EBS snapshots via AWS CLI (`aws ec2 describe-volumes`, `aws ec2 create-snapshot`)

## Sources Consulted
- ClickHouse SYSTEM statements: https://clickhouse.com/docs/en/sql-reference/statements/system
- ClickHouse ALTER PARTITION (FREEZE / UNFREEZE): https://clickhouse.com/docs/en/sql-reference/statements/alter/partition
- ClickHouse `system.parts` columns: https://clickhouse.com/docs/en/operations/system-tables/parts
- LVM `lvcreate(8)` snapshot option (`-s`, `-L`, `-n`) — Linux man pages
- AWS CLI EC2 reference: `create-snapshot`, `describe-volumes`

## Issues Found

1. **Misleading comments on `SYSTEM SYNC FILE CACHE` / `SYSTEM FLUSH LOGS`.**
   The original post claimed `SYSTEM SYNC FILE CACHE` would "freeze all tables to prevent writes" and that `SYSTEM FLUSH LOGS` flushes the ReplicatedMergeTree replication queue. Both are incorrect:
   - `SYSTEM SYNC FILE CACHE` performs a sync syscall across ClickHouse's filesystem cache — it does not freeze tables or block writes.
   - `SYSTEM FLUSH LOGS` flushes buffered rows into system log tables (e.g., `query_log`); it has nothing to do with the replication queue (which is managed via `SYSTEM STOP/START REPLICATION QUEUES` or `SYSTEM SYNC REPLICA`).
   Rewrote the code comments to describe what each command actually does.

2. **Non-existent `shadow_path` column in `system.parts`.**
   The original SELECT query referenced a `shadow_path` column that does not exist in `system.parts`; the query would fail. The correct column for identifying parts with a frozen backup is `is_frozen` (UInt8). Replaced the query with `SELECT database, table, partition, name, rows FROM system.parts WHERE is_frozen = 1;`.

## Review Notes
- `ALTER TABLE ... UNFREEZE WITH NAME 'name'` is correct. Note that `WITH NAME` is required for `UNFREEZE` (unlike `FREEZE` where it is optional).
- `ALTER TABLE ... FREEZE WITH NAME 'backup_name'` does create hardlinks under `/var/lib/clickhouse/shadow/<backup_name>/` with an internal subdirectory structure (e.g., `store/<uuid>/...`). The post's simplified path is adequate for the tutorial.
- There is no official system table that enumerates frozen backups by name — users who need a catalogue of frozen snapshots should list `/var/lib/clickhouse/shadow/` directly.
- LVM snapshot sizing (`-L 50G`) is illustrative; in practice the snapshot size must be large enough to hold all CoW changes that occur during the life of the snapshot.
- The post covers server-level filesystem snapshots but does not discuss restoring from LVM/EBS snapshots — a restore section would strengthen the tutorial but was out of scope for this review.

# How to Configure PostgreSQL Write-Ahead Log (WAL) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, PostgreSQL, Database, Performance, Backup

Description: Learn how to configure PostgreSQL Write-Ahead Log (WAL) on Ubuntu for better durability, replication, and point-in-time recovery.

---

PostgreSQL's Write-Ahead Log (WAL) is one of the most important mechanisms underpinning database durability and replication. Every change to data pages is first written to WAL before the actual data files are modified. This ensures that if the server crashes, PostgreSQL can replay WAL records and recover to a consistent state. Getting WAL configuration right directly affects crash recovery time, replication lag, backup strategy, and overall performance.

## Understanding WAL Basics

WAL records are written to files in `$PGDATA/pg_wal/`. Each WAL file is 16 MB by default, named with a 24-character hexadecimal identifier like `000000010000000000000001`. PostgreSQL keeps enough WAL files to allow recovery and to serve streaming replication standbys.

Key concepts:

- **LSN (Log Sequence Number)** - a byte offset into the WAL stream, used to track position
- **Checkpoint** - periodic flush of dirty pages to disk; WAL before the checkpoint is no longer needed for crash recovery
- **WAL segment** - a single WAL file (16 MB by default)
- **WAL level** - controls how much information is written to WAL

## Prerequisites

A running PostgreSQL instance on Ubuntu (this guide uses PostgreSQL 16, but applies to 14 and 15 as well):

```bash
# Install PostgreSQL if not already present
sudo apt update
sudo apt install -y postgresql postgresql-contrib

# Verify the service is running
sudo systemctl status postgresql
```

The main configuration file is typically at `/etc/postgresql/16/main/postgresql.conf`.

## WAL Level Settings

The `wal_level` parameter controls what is written to WAL:

```bash
# View current wal_level
sudo -u postgres psql -c "SHOW wal_level;"
```

Available levels:
- `minimal` - minimum WAL, no replication or archiving possible
- `replica` (default) - supports streaming replication and base backups
- `logical` - adds information needed for logical decoding/replication

For most production setups, `replica` is correct. Use `logical` only if you need logical replication or third-party CDC tools like Debezium.

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/16/main/postgresql.conf
```

```ini
# WAL level - replica is default and covers streaming replication
wal_level = replica

# For logical replication or CDC tools
# wal_level = logical
```

## Checkpoint Configuration

Checkpoints flush dirty buffers to disk and mark a safe recovery point. Frequent checkpoints reduce recovery time but increase I/O load during normal operation.

```ini
# Time between automatic checkpoints (default 5min)
checkpoint_timeout = 10min

# Maximum WAL size that can be generated between checkpoints
# PostgreSQL triggers a checkpoint if WAL exceeds this
max_wal_size = 2GB

# Minimum WAL size to keep
min_wal_size = 512MB

# Spread checkpoint I/O over this fraction of checkpoint_timeout
# 0.9 means spread over 90% of the interval (reduces I/O spikes)
checkpoint_completion_target = 0.9
```

For write-heavy workloads, increasing `max_wal_size` to 4 GB or more reduces checkpoint frequency and can improve throughput. Monitor `pg_stat_bgwriter` for checkpoint data:

```sql
-- Check checkpoint stats
SELECT checkpoints_timed, checkpoints_req, checkpoint_write_time,
       checkpoint_sync_time, buffers_checkpoint, buffers_clean, buffers_backend
FROM pg_stat_bgwriter;
```

If `checkpoints_req` is high relative to `checkpoints_timed`, checkpoints are being triggered by WAL size rather than time - increase `max_wal_size`.

## WAL Archiving

WAL archiving copies completed WAL segments to an archive location, enabling point-in-time recovery (PITR) and off-site backups.

```ini
# Enable WAL archiving
archive_mode = on

# Command to archive each WAL segment
# %p = full path to WAL file, %f = filename only
archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'

# For archiving to S3 (using aws-cli or WAL-G)
# archive_command = 'wal-g wal-push %p'
```

Create the archive directory:

```bash
sudo mkdir -p /var/lib/postgresql/wal_archive
sudo chown postgres:postgres /var/lib/postgresql/wal_archive
```

After changing `archive_mode`, a restart is required:

```bash
sudo systemctl restart postgresql
```

Verify archiving is working:

```sql
-- Force a WAL switch and check archive status
SELECT pg_switch_wal();

-- Check for archiving failures
SELECT * FROM pg_stat_archiver;
```

The `last_failed_wal` and `last_failed_time` columns will show recent failures if the archive command is failing.

## WAL Retention for Replication

When running streaming replication, PostgreSQL must retain enough WAL for standbys to catch up. Use `wal_keep_size` to ensure a minimum amount of WAL is kept:

```ini
# Keep at least 1 GB of WAL segments regardless of standby state
wal_keep_size = 1GB
```

Alternatively, use replication slots - they guarantee WAL is retained until the slot consumer has confirmed receipt, but they can cause disk exhaustion if a standby falls too far behind:

```sql
-- Create a physical replication slot
SELECT pg_create_physical_replication_slot('standby1');

-- View slot status and WAL retained
SELECT slot_name, active, restart_lsn,
       pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS bytes_behind
FROM pg_replication_slots;
```

## Synchronous Commit Settings

`synchronous_commit` controls whether a transaction waits for WAL to be flushed before returning success to the client:

```ini
# on = wait for WAL flush to local disk (default, safe)
# off = don't wait, risk losing last few transactions on crash
# local = wait for local flush only (useful if you don't need remote sync)
# remote_write = wait for standby to receive and write (not flush)
# remote_apply = wait for standby to apply (highest durability)
synchronous_commit = on
```

For applications that can tolerate minor data loss in exchange for better write throughput:

```sql
-- Set per-transaction (session level)
SET synchronous_commit = off;
INSERT INTO events ...;
```

## WAL Compression

WAL compression reduces disk space and network bandwidth for replication, with a small CPU overhead:

```ini
# Compress WAL using lz4 (fast) or zstd (better ratio, PostgreSQL 15+)
wal_compression = lz4
```

Check current compression:

```bash
sudo -u postgres psql -c "SHOW wal_compression;"
```

## Monitoring WAL Activity

```sql
-- Current WAL write position
SELECT pg_current_wal_lsn(), pg_current_wal_insert_lsn();

-- WAL files currently on disk
SELECT count(*) AS wal_files,
       sum(size) / 1024 / 1024 AS total_mb
FROM pg_ls_waldir();

-- WAL generation rate per second
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0') / 1024 / 1024 AS total_wal_mb;
```

For ongoing WAL throughput monitoring, use `pg_stat_wal` (PostgreSQL 14+):

```sql
SELECT wal_records, wal_fpi, wal_bytes, wal_buffers_full,
       wal_write, wal_sync, wal_write_time, wal_sync_time
FROM pg_stat_wal;
```

## Applying Changes

After editing `postgresql.conf`, some parameters require a reload and others require a full restart:

```bash
# Reload for parameters that don't need restart
sudo systemctl reload postgresql

# Full restart for parameters like wal_level and archive_mode
sudo systemctl restart postgresql

# Check which parameters need restart
sudo -u postgres psql -c "SELECT name, setting, pending_restart FROM pg_settings WHERE pending_restart = true;"
```

## Summary

WAL configuration touches multiple dimensions of PostgreSQL operation. For a production server:

- Set `wal_level = replica` for streaming replication support
- Tune `checkpoint_timeout` and `max_wal_size` to balance recovery time vs. I/O load
- Enable `archive_mode` and a reliable `archive_command` for PITR
- Monitor `pg_stat_bgwriter`, `pg_stat_archiver`, and `pg_stat_wal` regularly
- Use replication slots carefully - always monitor for slot lag

Proper WAL configuration is foundational for any serious PostgreSQL deployment. It underpins backups, replication, and your ability to recover from failures with minimal data loss.

# How to Configure NDB Cluster Memory Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NDB Cluster, Memory, Configuration, Performance

Description: Learn how to configure DataMemory, IndexMemory, and other memory parameters in MySQL NDB Cluster for optimal performance and capacity planning.

---

## Why Memory Configuration Matters

MySQL NDB Cluster is primarily an in-memory database. All table data and indexes must fit within the configured memory limits on the data nodes. If `DataMemory` or `IndexMemory` is exhausted, write operations fail with `Table is full` errors. Proper memory sizing is the most critical NDB Cluster configuration task.

## Key Memory Parameters

All memory parameters are set in `config.ini` on the management node under `[ndbd default]` or individual `[ndbd]` sections:

```text
[ndbd default]
DataMemory=2G          # Memory for row data storage
IndexMemory=512M       # Memory for hash indexes (deprecated in NDB 8.0)
TransactionMemory=256M # Memory for active transactions (MySQL 8.0+)
```

## DataMemory

`DataMemory` stores the actual row data for all NDB tables. Each 32KB page holds approximately 80-100 rows depending on row size.

```text
[ndbd default]
DataMemory=4G
```

Check current usage:

```bash
ndb_mgm -e "all report memory"
```

```text
Node 2: Data usage is 67%(686 32K pages of total 1024)
```

## IndexMemory

> **Note:** `IndexMemory` is deprecated in NDB 8.0 (MySQL 8.0) and subject to removal in a future release. In NDB 8.0, hash indexes are allocated from `DataMemory`. The parameter below applies to NDB 7.6 and earlier.

`IndexMemory` stores hash index entries for primary keys and unique indexes:

```text
[ndbd default]
IndexMemory=1G
```

Rule of thumb: allocate approximately 40 bytes per row for the primary key hash index.

## TransactionMemory (MySQL 8.0+)

In MySQL 8.0, transaction memory was separated from `DataMemory`:

```text
[ndbd default]
TransactionMemory=256M
```

In older versions, transaction memory was part of `DataMemory`.

## Redo Log Buffer

Configure the redo log buffer for write-heavy workloads:

```text
[ndbd default]
RedoBuffer=64M
```

## Operating System Memory Overhead

Each data node also consumes OS memory for:
- The NDB process itself (~500MB minimum)
- Undo log buffers
- DiskPageBufferMemory (if using disk-based columns)

Plan for at least 1-2GB of OS memory overhead per data node in addition to `DataMemory` and `IndexMemory`.

## Example: Sizing for a 50GB Dataset

For 50GB of row data distributed across 4 data nodes with `NoOfReplicas=2`:

```text
[ndbd default]
NoOfReplicas=2
# 50GB total data across 4 nodes / 2 node groups = 25GB per node
# Add 20% overhead for metadata and fragmentation
DataMemory=30G
# Approximately 10% of DataMemory for indexes
IndexMemory=3G
TransactionMemory=512M
```

Total RAM per data node: ~35GB data+index + ~2GB OS overhead = ~37GB

## Applying Configuration Changes

Memory changes require a rolling restart of data nodes:

```bash
# Restart node 2
ndb_mgm -e "2 restart"

# Wait for node 2 to rejoin, then restart node 3
ndb_mgm -e "3 restart"
```

## Monitoring Memory with ndbinfo

```sql
USE ndbinfo;
SELECT node_id, memory_type, used, total,
       ROUND(100 * used / total, 1) AS pct_used
FROM memoryusage
ORDER BY node_id, memory_type;
```

```text
node_id | memory_type  | used      | total     | pct_used
2       | DATA_MEMORY  | 681574400 | 1073741824 | 63.5
2       | INDEX_MEMORY | 68157440  | 536870912  | 12.7
```

## Summary

NDB Cluster memory must be sized carefully because exhausting `DataMemory` stops write operations immediately. Size `DataMemory` to hold your full dataset plus 30% headroom, allocate `IndexMemory` at roughly 10-15% of `DataMemory` (for NDB 7.6 and earlier; in NDB 8.0, hash indexes use `DataMemory`), and monitor usage via `ndb_mgm -e "all report memory"` and the `ndbinfo.memoryusage` table. Apply changes via rolling data node restarts.

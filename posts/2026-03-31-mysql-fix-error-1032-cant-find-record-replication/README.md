# How to Fix ERROR 1032 Can't Find Record in MySQL Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Error, Replica, Recovery

Description: Fix MySQL replication ERROR 1032 when the replica cannot find a row to update or delete by skipping the event or manually synchronizing the diverged data.

---

MySQL replication ERROR 1032 occurs when the replica's SQL thread tries to execute a `DELETE` or `UPDATE` from the source's binary log, but the row does not exist on the replica. The `SHOW REPLICA STATUS` output shows: `Last_SQL_Error: Could not execute Delete_rows event on table mydb.orders; Can't find record in 'orders'`.

## Why This Happens

- A row was manually deleted from the replica but not the source
- A previous replication error was skipped, leaving the replica out of sync
- Row-based replication events targeting rows that were already deleted
- The table had a different state when replication started

## Diagnose the Problem

```sql
-- On the replica
SHOW REPLICA STATUS\G
-- Look for: Last_SQL_Errno: 1032
-- Note: Last_SQL_Error, Exec_Source_Log_File, Exec_Source_Log_Pos
```

Check if the row exists on the replica:

```sql
-- Use the table and key from the error message
SELECT * FROM orders WHERE id = 12345;
```

## Fix 1: Skip the Single Event

If the data divergence is minor and you know the replica is otherwise consistent:

```sql
-- MySQL 8.0+ (REPLICA syntax)
STOP REPLICA SQL_THREAD;
SET GLOBAL SQL_REPLICA_SKIP_COUNTER = 1;
START REPLICA SQL_THREAD;

-- MySQL 5.7 and earlier
STOP SLAVE SQL_THREAD;
SET GLOBAL SQL_SLAVE_SKIP_COUNTER = 1;
START SLAVE SQL_THREAD;

-- Verify replication is running
SHOW REPLICA STATUS\G
```

Use this only if you understand the impact and the skipped event is truly safe to ignore (e.g., deleting a row that was already deleted).

## Fix 2: Insert the Missing Row on the Replica

If the row should exist but was accidentally deleted from the replica:

```sql
-- On the replica (pause replication first)
STOP REPLICA SQL_THREAD;

-- Insert the missing row based on source data
INSERT INTO orders (id, customer_id, total, status, created_at)
VALUES (12345, 42, 150.00, 'completed', '2024-06-15 10:00:00');

-- Resume replication
START REPLICA SQL_THREAD;
```

## Fix 3: Use GTID Skip for GTID Replication

If using GTID-based replication, skip a specific transaction:

```sql
-- Get the GTID of the failing transaction from SHOW REPLICA STATUS
-- Retrieved_Gtid_Set or Executed_Gtid_Set

STOP REPLICA;

-- Inject an empty transaction for the failing GTID
SET GTID_NEXT = 'source_uuid:transaction_id';
BEGIN;
COMMIT;
SET GTID_NEXT = 'AUTOMATIC';

START REPLICA;
```

## Fix 4: Resync the Table from Source

For many 1032 errors on the same table, resync the entire table:

```bash
# On the source - dump the specific table
mysqldump -u root -p --single-transaction \
  --no-create-info --replace mydb orders > orders_sync.sql
```

```sql
-- On the replica
STOP REPLICA SQL_THREAD;
```

```bash
mysql -u root -p mydb < orders_sync.sql
```

```sql
START REPLICA SQL_THREAD;
```

## Fix: Use pt-table-sync to Fix Divergence

Percona Toolkit's `pt-table-sync` can fix data differences between source and replica:

```bash
pt-table-sync --execute --sync-to-master \
  h=replica-host,u=root,p=password,D=mydb,t=orders
```

## Summary

ERROR 1032 indicates data divergence between source and replica. For a single isolated event, use `SQL_REPLICA_SKIP_COUNTER`. For broader divergence, resync the affected table from the source. Always investigate why the divergence occurred to prevent it from accumulating. For production systems, consider `pt-table-checksum` and `pt-table-sync` for regular consistency checks.

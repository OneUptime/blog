# How to Enable and Disable MySQL Super Read-Only Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Read-Only, Replication, Security, Administration

Description: Learn how MySQL super_read_only mode blocks all writes including from SUPER users, how to enable it safely on replicas, and how to disable it for failover.

---

## What Is Super Read-Only Mode?

MySQL `read_only = ON` prevents writes from regular users but allows users with the `SUPER` privilege or `CONNECTION_ADMIN` privilege to write. This means an accidental DBA command could still corrupt a replica.

`super_read_only = ON` closes this gap - it blocks writes from ALL users, including those with SUPER privilege. Only the replication thread (used by `START REPLICA`) is permitted to write.

## Enabling super_read_only

Enable at runtime:

```sql
SET GLOBAL super_read_only = ON;
```

When you set `super_read_only = ON`, MySQL automatically sets `read_only = ON` as well. Verify:

```sql
SHOW GLOBAL VARIABLES WHERE Variable_name IN ('read_only', 'super_read_only');
```

```text
+------------------+-------+
| Variable_name    | Value |
+------------------+-------+
| read_only        | ON    |
| super_read_only  | ON    |
+------------------+-------+
```

Persist in `my.cnf` for replicas:

```ini
[mysqld]
read_only = ON
super_read_only = ON
```

## Testing super_read_only Enforcement

Verify that even a SUPER user is blocked:

```sql
-- As root (has SUPER privilege)
INSERT INTO test_table (name) VALUES ('test');
-- ERROR 1290 (HY000): The MySQL server is running with the --super-read-only option
```

The replication thread is still exempt:

```sql
-- Replication applies normally
SHOW REPLICA STATUS\G
-- Replica_IO_Running: Yes
-- Replica_SQL_Running: Yes
```

## Disabling super_read_only for Failover

During a failover (promoting a replica to primary), disable `super_read_only` before routing traffic:

```sql
-- Step 1: Stop replication
STOP REPLICA;

-- Step 2: Disable super read-only
SET GLOBAL super_read_only = OFF;

-- Step 3: Disable read_only
SET GLOBAL read_only = OFF;

-- Step 4: Verify
SHOW GLOBAL VARIABLES WHERE Variable_name IN ('read_only', 'super_read_only');
```

In automated failover tools like Orchestrator or MHA (Master High Availability), this sequence runs automatically when promoting a replica.

## Using super_read_only in MySQL InnoDB Cluster

MySQL InnoDB Cluster group replication enforces `super_read_only = ON` on secondary members automatically:

```sql
-- On a secondary member
SELECT @@super_read_only;
-- 1 (ON)
```

When the primary fails, the cluster promotes a secondary and sets `super_read_only = OFF` on the new primary automatically.

## Combining with Fencing During Maintenance

For planned maintenance on a primary, use super_read_only to safely fence writes:

```sql
-- On primary before maintenance
SET GLOBAL super_read_only = ON;

-- Verify no active transactions
SHOW PROCESSLIST;

-- Perform maintenance (backup, upgrade prep, etc.)

-- Re-enable writes after maintenance
SET GLOBAL super_read_only = OFF;
SET GLOBAL read_only = OFF;
```

## Monitoring super_read_only State

Alert if the primary server has `super_read_only = ON` unexpectedly:

```sql
SELECT
  VARIABLE_NAME,
  VARIABLE_VALUE
FROM performance_schema.global_variables
WHERE VARIABLE_NAME IN ('read_only', 'super_read_only');
```

Automate this check in your monitoring system and page on-call if the primary enters read-only unexpectedly.

## Difference Between read_only and super_read_only

| Setting | Blocks Regular Users | Blocks SUPER Users | Blocks Replication |
|---|---|---|---|
| read_only = ON | Yes | No | No |
| super_read_only = ON | Yes | Yes | No |

## Summary

`super_read_only = ON` provides the strongest write protection for MySQL replicas and standby servers by blocking all user writes including SUPER privilege holders, while allowing replication threads to continue. Enable it in `my.cnf` for all replicas, and include the `SET GLOBAL super_read_only = OFF` step in your automated failover runbook when promoting a replica to primary.

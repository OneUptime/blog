# How to Convert Binary Log Position Replication to GTID in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, GTID, Migration, Configuration

Description: Learn how to safely convert MySQL replication from binary log file and position coordinates to GTID-based replication with minimal downtime.

---

GTID-based replication is simpler to manage than binary log position-based replication. GTIDs make it easier to promote replicas, add new replicas, and recover from failures. If you are running an existing position-based replication setup, converting to GTID is a worthwhile operational improvement.

## Prerequisites

- MySQL 8.0.23 or later on all servers (the online GTID migration feature exists since 5.7.6, but the SQL syntax used in this guide requires 8.0.23+)
- All servers running the same or compatible MySQL versions
- Access to modify `my.cnf` and restart servers

## Check Current State

Before converting, verify current replication status:

```sql
-- On source
SHOW MASTER STATUS;
SHOW VARIABLES LIKE 'gtid_mode';
SHOW VARIABLES LIKE 'enforce_gtid_consistency';

-- On replica
SHOW REPLICA STATUS\G
```

## Online Conversion (MySQL 8.0.23+)

MySQL 5.7.6 introduced online GTID migration through four sequential `gtid_mode` states. Perform these steps on ALL servers (source and all replicas) in order.

**Step 1: Enable enforce_gtid_consistency on all servers**

```sql
-- Apply to all servers, no restart needed
SET GLOBAL enforce_gtid_consistency = 'WARN';
-- Monitor error log for warnings, then:
SET GLOBAL enforce_gtid_consistency = 'ON';
```

**Step 2: Progress GTID mode through intermediate states (on all servers)**

```sql
-- Step 2a
SET GLOBAL gtid_mode = 'OFF_PERMISSIVE';

-- Step 2b
SET GLOBAL gtid_mode = 'ON_PERMISSIVE';
```

**Step 3: Verify no more anonymous transactions in use**

```sql
-- On all servers, check that no anonymous transactions are pending
SHOW STATUS LIKE 'ONGOING_ANONYMOUS_TRANSACTION_COUNT';
-- Wait until the value is 0 on every server
```

**Step 4: Enable GTID mode fully on all servers**

```sql
SET GLOBAL gtid_mode = 'ON';
```

**Step 5: Make changes persistent in my.cnf on all servers**

```ini
[mysqld]
gtid_mode = ON
enforce_gtid_consistency = ON
log_bin = /var/lib/mysql/binlogs/mysql-bin
log_replica_updates = ON
```

## Switch the Replica to GTID Auto-Position

Once all servers have GTID mode ON, update the replication configuration:

```sql
-- On the replica
STOP REPLICA;

CHANGE REPLICATION SOURCE TO
  SOURCE_AUTO_POSITION = 1;

START REPLICA;
SHOW REPLICA STATUS\G
```

Verify the change:

```text
Auto_Position: 1
Retrieved_Gtid_Set: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee:1-500
Executed_Gtid_Set: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee:1-500
```

## Verifying GTID-Based Replication

Confirm replication is healthy and using GTIDs:

```sql
-- On source, check executed GTIDs
SELECT @@global.gtid_executed;

-- On replica, verify it matches source
SHOW REPLICA STATUS\G
-- Retrieved_Gtid_Set should equal Executed_Gtid_Set when caught up
```

Make a test change on the source:

```sql
-- On source
INSERT INTO mydb.test_gtid VALUES (NOW(), 'gtid test');

-- On replica (should appear within seconds)
SELECT * FROM mydb.test_gtid ORDER BY created_at DESC LIMIT 1;
```

## Reverting to Position-Based Replication

If you need to roll back, reverse the steps:

```sql
-- First, on each replica, switch back to position-based replication
STOP REPLICA;
CHANGE REPLICATION SOURCE TO
  SOURCE_AUTO_POSITION = 0,
  SOURCE_LOG_FILE = 'mysql-bin.000010',
  SOURCE_LOG_POS = 157;
START REPLICA;

-- Then, on all servers, step down gtid_mode in order:
SET GLOBAL gtid_mode = 'ON_PERMISSIVE';
SET GLOBAL gtid_mode = 'OFF_PERMISSIVE';
-- Wait until @@global.gtid_owned is empty on each server
SELECT @@global.gtid_owned;
SET GLOBAL gtid_mode = 'OFF';
SET GLOBAL enforce_gtid_consistency = 'OFF';
```

## Summary

Converting from position-based to GTID replication in MySQL 8.0.23+ is an online operation that does not require downtime. Progress `gtid_mode` through `OFF_PERMISSIVE` and `ON_PERMISSIVE` states on all servers, wait for anonymous transactions to drain, then enable `ON` everywhere. Finally, run `CHANGE REPLICATION SOURCE TO SOURCE_AUTO_POSITION=1` on each replica and persist the settings in `my.cnf`. The resulting GTID setup is significantly easier to manage for failover, replica addition, and recovery operations.

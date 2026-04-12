# How to Monitor Replication Status with SHOW REPLICA STATUS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Monitoring, Database Administration

Description: Learn how to use SHOW REPLICA STATUS to monitor MySQL replication health, check lag, and diagnose common replication problems.

---

## Overview

`SHOW REPLICA STATUS` is the primary command for inspecting the state of a MySQL replica. It returns a detailed snapshot of the replication threads, lag, errors, and log positions.

In MySQL 8.0.22+, the command is `SHOW REPLICA STATUS`. Earlier versions use `SHOW SLAVE STATUS`.

## Running the Command

```sql
SHOW REPLICA STATUS\G
```

The `\G` modifier formats output vertically, making it much easier to read in the terminal.

## Key Fields Explained

### Thread Status

```text
Replica_IO_Running: Yes
Replica_SQL_Running: Yes
```

Both must be `Yes` for replication to be working. If either shows `No` or `Connecting`, replication has stopped or stalled.

### Replication Lag

```text
Seconds_Behind_Source: 0
```

This shows how many seconds behind the primary the replica is. A value of `NULL` usually means the SQL thread is not running or there is no connection to the primary.

### Error Information

```text
Last_IO_Errno: 0
Last_IO_Error:
Last_SQL_Errno: 0
Last_SQL_Error:
```

Non-zero error numbers indicate a replication problem. The error string explains what failed.

### Log Positions

```text
Source_Log_File: mysql-bin.000042
Read_Source_Log_Pos: 154892
Relay_Source_Log_File: mysql-bin.000042
Exec_Source_Log_Pos: 154892
```

`Read_Source_Log_Pos` is what the IO thread has received; `Exec_Source_Log_Pos` is what the SQL thread has applied. A growing gap between these indicates the SQL thread is falling behind.

### GTID Information

```text
Retrieved_Gtid_Set: 3e11fa47-71ca-11e1-9e33-c80aa9429562:1-5
Executed_Gtid_Set: 3e11fa47-71ca-11e1-9e33-c80aa9429562:1-5
```

When GTID mode is enabled, these sets tell you which transactions have been retrieved and executed.

## Checking All Channels (Multi-Source)

If you use multi-source replication, check each channel:

```sql
SHOW REPLICA STATUS FOR CHANNEL 'primary1'\G
SHOW REPLICA STATUS FOR CHANNEL 'primary2'\G
```

## Automating Lag Monitoring with Performance Schema

For a more query-friendly view, use Performance Schema:

```sql
SELECT
  CHANNEL_NAME,
  SERVICE_STATE,
  LAST_ERROR_NUMBER,
  LAST_ERROR_MESSAGE
FROM performance_schema.replication_connection_status;
```

```sql
SELECT
  CHANNEL_NAME,
  SERVICE_STATE,
  LAST_APPLIED_TRANSACTION_ORIGINAL_COMMIT_TIMESTAMP,
  NOW()
FROM performance_schema.replication_applier_status_by_worker;
```

## Diagnosing Common Issues

| Symptom | Likely Cause |
|---|---|
| `Replica_IO_Running: No` | Network problem or wrong credentials |
| `Replica_SQL_Running: No` | SQL error on the replica |
| `Seconds_Behind_Source` growing | Replica can't keep up with write load |
| `Last_IO_Error` about SSL | TLS misconfiguration |

## Summary

`SHOW REPLICA STATUS\G` is the go-to command for replica health checks. Focus on `Replica_IO_Running`, `Replica_SQL_Running`, `Seconds_Behind_Source`, and the last error fields to quickly diagnose issues. For automated monitoring, query `performance_schema.replication_connection_status` instead.

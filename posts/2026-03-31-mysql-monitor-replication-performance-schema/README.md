# How to Monitor Replication with Performance Schema in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Performance Schema, Replication, Replica, Monitoring

Description: Use MySQL Performance Schema replication tables to monitor replica lag, channel status, applier threads, and replication errors in real time.

---

## Overview

MySQL Performance Schema includes a dedicated set of tables for monitoring replication without relying solely on `SHOW REPLICA STATUS`. These tables provide granular data about replication channels, applied transactions, worker threads, and errors.

## Key Replication Tables in Performance Schema

```text
replication_connection_configuration
replication_connection_status
replication_applier_configuration
replication_applier_status
replication_applier_status_by_coordinator
replication_applier_status_by_worker
replication_group_members
replication_group_member_stats
```

## Checking Connection Status

```sql
SELECT
  CHANNEL_NAME,
  SOURCE_UUID,
  SERVICE_STATE,
  RECEIVED_TRANSACTION_SET,
  LAST_ERROR_NUMBER,
  LAST_ERROR_MESSAGE,
  LAST_HEARTBEAT_TIMESTAMP
FROM performance_schema.replication_connection_status\G
```

## Monitoring Applier Lag

```sql
SELECT
  CHANNEL_NAME,
  SERVICE_STATE,
  REMAINING_DELAY,
  COUNT_TRANSACTIONS_RETRIES
FROM performance_schema.replication_applier_status\G
```

## Checking Per-Worker Applier Status (MTS)

When using multi-threaded replication, inspect each worker:

```sql
SELECT
  CHANNEL_NAME,
  WORKER_ID,
  SERVICE_STATE,
  LAST_APPLIED_TRANSACTION,
  LAST_APPLIED_TRANSACTION_END_APPLY_TIMESTAMP,
  LAST_ERROR_MESSAGE
FROM performance_schema.replication_applier_status_by_worker
ORDER BY CHANNEL_NAME, WORKER_ID;
```

## Calculating Replication Lag

```sql
SELECT
  CHANNEL_NAME,
  TIMESTAMPDIFF(
    SECOND,
    LAST_APPLIED_TRANSACTION_ORIGINAL_COMMIT_TIMESTAMP,
    NOW()
  ) AS lag_seconds,
  LAST_APPLIED_TRANSACTION
FROM performance_schema.replication_applier_status_by_worker
WHERE SERVICE_STATE = 'ON'
ORDER BY lag_seconds DESC;
```

## Monitoring Group Replication

For InnoDB Cluster or Group Replication setups:

```sql
-- Member status
SELECT
  MEMBER_ID,
  MEMBER_HOST,
  MEMBER_PORT,
  MEMBER_STATE,
  MEMBER_ROLE
FROM performance_schema.replication_group_members;

-- Transaction stats per member
SELECT
  MEMBER_ID,
  COUNT_TRANSACTIONS_IN_QUEUE,
  COUNT_TRANSACTIONS_CHECKED,
  COUNT_CONFLICTS_DETECTED,
  COUNT_TRANSACTIONS_ROWS_VALIDATING
FROM performance_schema.replication_group_member_stats;
```

## Alerting on Replication Errors

```sql
SELECT
  CHANNEL_NAME,
  LAST_ERROR_NUMBER,
  LAST_ERROR_MESSAGE,
  LAST_ERROR_TIMESTAMP
FROM performance_schema.replication_applier_status_by_worker
WHERE LAST_ERROR_NUMBER != 0;
```

## Summary

MySQL Performance Schema replication tables provide a comprehensive, programmatic alternative to `SHOW REPLICA STATUS`. By querying `replication_connection_status`, `replication_applier_status_by_worker`, and group replication tables, you can build dashboards and alerting systems that detect replication lag, worker failures, and connectivity issues before they impact production workloads.

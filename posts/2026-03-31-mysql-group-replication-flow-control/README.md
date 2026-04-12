# How to Configure Flow Control in MySQL Group Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Group Replication, Flow Control, Performance, Replication

Description: Learn how MySQL Group Replication flow control prevents fast primary nodes from overwhelming slow secondaries, and how to tune flow control thresholds.

---

## What Is Flow Control

MySQL Group Replication flow control is a back-pressure mechanism. When a secondary node falls behind in applying transactions, flow control temporarily throttles the primary to allow secondaries to catch up. Without it, the applier queue on secondaries could grow unbounded, leading to increased failover time and out-of-memory errors.

## How Flow Control Works

Flow control monitors two queues on each member:

1. **Certification queue** - transactions waiting to be certified
2. **Applier queue** - certified transactions waiting to be applied to the database

When either queue exceeds a configurable threshold, flow control activates and slows down the writer.

## View Current Flow Control Status

```sql
SELECT
  MEMBER_ID,
  COUNT_TRANSACTIONS_IN_QUEUE,
  COUNT_TRANSACTIONS_REMOTE_IN_APPLIER_QUEUE
FROM performance_schema.replication_group_member_stats;
```

Check the current flow control configuration:

```sql
SHOW VARIABLES LIKE 'group_replication_flow_control%';
```

## Configure Flow Control Thresholds

The key variables are:

```sql
-- Maximum transactions in the certifier queue before flow control triggers
SHOW VARIABLES LIKE 'group_replication_flow_control_certifier_threshold';

-- Maximum transactions in the applier queue before flow control triggers
SHOW VARIABLES LIKE 'group_replication_flow_control_applier_threshold';
```

```text
+------------------------------------------------------+-------+
| Variable_name                                        | Value |
+------------------------------------------------------+-------+
| group_replication_flow_control_certifier_threshold   | 25000 |
| group_replication_flow_control_applier_threshold     | 25000 |
+------------------------------------------------------+-------+
```

Lower these values to trigger flow control sooner (protecting slow secondaries at the cost of primary throughput):

```sql
SET GLOBAL group_replication_flow_control_certifier_threshold = 10000;
SET GLOBAL group_replication_flow_control_applier_threshold = 10000;
```

Raise them if your secondaries are fast enough and the defaults cause unnecessary throttling.

## Set the Flow Control Mode

```sql
SHOW VARIABLES LIKE 'group_replication_flow_control_mode';
```

```text
+-------------------------------------+--------+
| Variable_name                       | Value  |
+-------------------------------------+--------+
| group_replication_flow_control_mode | QUOTA  |
+-------------------------------------+--------+
```

Modes:
- `QUOTA` (default) - applies proportional throttling based on queue depth
- `DISABLED` - disables flow control entirely (not recommended for production)

Disable only for benchmarking or when secondaries are known to be fast:

```sql
SET GLOBAL group_replication_flow_control_mode = 'DISABLED';
```

## Tune the Throttle Period

The `group_replication_flow_control_period` variable controls how often (in seconds) the flow control algorithm recalculates the quota:

```sql
SHOW VARIABLES LIKE 'group_replication_flow_control_period';
-- Default: 1 second
SET GLOBAL group_replication_flow_control_period = 1;
```

A shorter period makes flow control more responsive but adds overhead.

## Monitor Flow Control Activation

Use a query to track how often flow control is being triggered:

```sql
SELECT
  MEMBER_HOST,
  COUNT_TRANSACTIONS_IN_QUEUE AS certifier_queue,
  COUNT_TRANSACTIONS_REMOTE_IN_APPLIER_QUEUE AS applier_queue,
  COUNT_TRANSACTIONS_LOCAL_ROLLBACK AS local_rollbacks
FROM performance_schema.replication_group_member_stats
JOIN performance_schema.replication_group_members USING (MEMBER_ID);
```

If the applier queue stays consistently above the threshold, consider upgrading the secondary hardware or reducing write load on the primary.

## Summary

MySQL Group Replication flow control protects slow secondaries by throttling the primary when applier or certifier queues exceed thresholds. Tune `group_replication_flow_control_certifier_threshold` and `group_replication_flow_control_applier_threshold` based on your workload. Monitor queue depths using `performance_schema.replication_group_member_stats` and set alerts when queues grow large to detect slow secondaries before they impact failover.

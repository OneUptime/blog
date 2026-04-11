# MySQL Source-Replica vs Multi-Source Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, High Availability

Description: Compare MySQL source-replica replication and multi-source replication to understand topology options, use cases, and configuration for each approach.

---

MySQL replication allows data to be copied from one server to another. The two main topologies are source-replica (classic one-to-many) and multi-source replication (many-to-one). Each serves different architectural needs.

## Source-Replica Replication

Source-replica (formerly master-slave) is the standard MySQL replication topology. One source server handles writes, and one or more replicas receive changes via the binary log.

```sql
-- On the source server: check binary log position
SHOW BINARY LOG STATUS\G
-- File: mysql-bin.000003
-- Position: 1234

-- On the replica: configure and start replication
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '192.168.1.10',
  SOURCE_USER = 'repl',
  SOURCE_PASSWORD = 'repl_password',
  SOURCE_LOG_FILE = 'mysql-bin.000003',
  SOURCE_LOG_POS = 1234;

START REPLICA;
SHOW REPLICA STATUS\G
```

### Use Cases for Source-Replica

- **Read scaling**: route SELECT queries to replicas to offload the source
- **High availability**: promote a replica to source if the source fails
- **Backup**: take backups from a replica without impacting the source
- **Reporting**: run long analytical queries on a replica

## GTID-Based Replication

MySQL 5.6+ supports GTID (Global Transaction Identifier) replication, which simplifies failover and replica management.

```sql
-- Enable GTID replication (set in my.cnf)
-- gtid_mode = ON
-- enforce_gtid_consistency = ON

-- GTID-based replica setup (no need to specify log file/position)
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '192.168.1.10',
  SOURCE_USER = 'repl',
  SOURCE_PASSWORD = 'repl_password',
  SOURCE_AUTO_POSITION = 1;

START REPLICA;
```

## Multi-Source Replication

Multi-source replication (introduced in MySQL 5.7) allows a single replica to receive changes from multiple source servers simultaneously. Each source has its own replication channel.

```sql
-- Add first source on channel 'shard1'
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '10.0.0.1',
  SOURCE_USER = 'repl',
  SOURCE_PASSWORD = 'pass',
  SOURCE_AUTO_POSITION = 1
  FOR CHANNEL 'shard1';

-- Add second source on channel 'shard2'
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '10.0.0.2',
  SOURCE_USER = 'repl',
  SOURCE_PASSWORD = 'pass',
  SOURCE_AUTO_POSITION = 1
  FOR CHANNEL 'shard2';

-- Start all channels
START REPLICA FOR CHANNEL 'shard1';
START REPLICA FOR CHANNEL 'shard2';

-- Monitor all channels
SHOW REPLICA STATUS FOR CHANNEL 'shard1'\G
SHOW REPLICA STATUS FOR CHANNEL 'shard2'\G
```

### Use Cases for Multi-Source Replication

- **Data consolidation**: merge data from multiple shards or regional databases into one analytics replica
- **Backup consolidation**: take one backup that covers multiple source databases
- **Central reporting**: aggregate data from multiple application databases into a single reporting server

## Conflict Resolution

Multi-source replication can have conflicts if the same table exists in multiple sources. Careful schema design is required.

```sql
-- Check for replication errors across channels
SELECT CHANNEL_NAME, LAST_ERROR_NUMBER, LAST_ERROR_MESSAGE
FROM performance_schema.replication_applier_status_by_worker
WHERE LAST_ERROR_NUMBER != 0;
```

## Comparison

| Factor | Source-Replica | Multi-Source |
|---|---|---|
| Sources | One source, many replicas | Many sources, one replica |
| Primary use case | Read scaling, HA | Data consolidation |
| Conflict risk | Low | Requires careful schema design |
| Complexity | Low | Moderate |
| Channel management | Single channel | Per-source channels |

## Summary

Source-replica replication is the standard topology for read scaling and high availability. Multi-source replication is used when you need to aggregate changes from multiple source databases into a single server for reporting, backup, or consolidation. Most production deployments start with source-replica and add multi-source only when a specific consolidation need arises.

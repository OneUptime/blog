# MySQL Replication vs Group Replication: Key Differences

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Group Replication, High Availability, Database

Description: Compare MySQL standard replication and Group Replication covering topology, failover, consistency, performance, and when to use each approach.

---

## Two Approaches to MySQL Replication

MySQL offers two primary replication mechanisms: classic source-replica replication (formerly master-slave) and Group Replication, a plugin-based multi-primary or single-primary topology introduced in MySQL 5.7.17. Both replicate data across nodes but differ fundamentally in how they handle writes, failures, and consistency.

## Classic Source-Replica Replication

In standard replication, one node is designated the source (primary). All writes go to the source, and one or more replicas apply changes asynchronously from the binary log.

Set up a replica:

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='source-host',
  SOURCE_USER='replication_user',
  SOURCE_PASSWORD='password',
  SOURCE_LOG_FILE='mysql-bin.000001',
  SOURCE_LOG_POS=4;
START REPLICA;
```

Check replication status:

```sql
SHOW REPLICA STATUS\G
```

Key characteristics:

- Asynchronous by default (semi-synchronous replication is an option)
- Replicas can lag behind the source
- Failover is manual unless you use orchestration tools like Orchestrator or MHA
- Simple to set up and widely supported

## Group Replication

Group Replication uses a consensus-based protocol (Paxos) to replicate transactions across all group members before they are committed. All members agree on the order of transactions, ensuring no data is lost during member failures.

Enable Group Replication on a member:

```sql
SET GLOBAL group_replication_bootstrap_group=ON;
START GROUP_REPLICATION;
SET GLOBAL group_replication_bootstrap_group=OFF;
```

Check member status:

```sql
SELECT * FROM performance_schema.replication_group_members;
```

Two modes are available:

- **Single-primary mode**: one member accepts writes; others are read-only replicas that automatically promote on failure
- **Multi-primary mode**: all members accept writes simultaneously; conflict detection resolves concurrent writes to the same row

## Consistency and Durability

This is the most important difference:

| Property | Classic Replication | Group Replication |
|---|---|---|
| Consistency | Eventually consistent (async) | Virtually synchronous |
| Data loss on failover | Possible (replica lag) | None (committed = durable) |
| Conflict detection | None | Built-in (multi-primary mode) |
| Transaction ordering | Not guaranteed across replicas | Guaranteed via Paxos |

## Performance Trade-offs

Classic replication is faster for write-heavy workloads because the source does not wait for replicas to acknowledge before committing. Group Replication introduces latency because every transaction must be certified across all members.

Monitor commit latency in Group Replication:

```sql
SELECT
  VARIABLE_NAME,
  VARIABLE_VALUE
FROM performance_schema.global_status
WHERE VARIABLE_NAME LIKE 'group_replication_%';
```

For workloads tolerant of eventual consistency and needing maximum write throughput, classic replication wins. For workloads that require zero data loss and automatic failover, Group Replication is better suited.

## Failover Behavior

Classic replication requires a manual or tool-assisted failover. If the source fails, a DBA or tool must promote a replica:

```bash
# Using Orchestrator to trigger failover
orchestrator-client -c recover -i source-host:3306
```

Group Replication handles failover automatically. If the primary member fails in single-primary mode, the group elects a new primary within seconds. Applications using MySQL Router or ProxySQL connected to the group endpoint will be automatically redirected.

## Network Requirements

Group Replication requires reliable, low-latency network connectivity between all members. It uses a dedicated group communication port (default 33061) in addition to the standard MySQL port (3306).

Configure the group communication address:

```sql
SET GLOBAL group_replication_local_address = "node1:33061";
SET GLOBAL group_replication_group_seeds = "node1:33061,node2:33061,node3:33061";
```

## When to Use Each

Use **classic replication** when:
- You need maximum write performance
- Your application tolerates some replication lag
- You have a simple read-scaling use case
- You are already using a failover tool like Orchestrator

Use **Group Replication** when:
- You require automatic failover with no data loss
- You need multi-master writes (multi-primary mode)
- You are building a highly available production cluster
- You are using MySQL InnoDB Cluster (which uses Group Replication internally)

## Summary

Classic replication is asynchronous and simple, providing read scaling at the cost of potential data loss during failover. Group Replication uses distributed consensus to ensure all committed transactions are durable across members, with automatic failover, at the cost of additional write latency. For critical production systems that cannot afford data loss, Group Replication or InnoDB Cluster is the right choice.

# What Is MySQL Group Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Group Replication, High Availability, Distributed Database, Paxos

Description: MySQL Group Replication is a built-in plugin providing fault-tolerant, distributed replication using a Paxos-based consensus protocol for automatic failover.

---

## Overview

MySQL Group Replication (MGR) is a MySQL plugin that implements a distributed fault-tolerant replication mechanism. Unlike traditional source-replica replication where the source is a single point of failure, Group Replication uses a Paxos-based consensus protocol to ensure that transactions are committed only when a majority of group members (a quorum) acknowledge them. This provides automatic failover and eliminates manual intervention when a member fails.

## Single-Primary vs Multi-Primary Mode

Group Replication runs in one of two modes:

**Single-Primary Mode** (default): One member is the primary and accepts writes. All other members are secondaries that accept reads. If the primary fails, the group automatically elects a new primary from the secondaries.

**Multi-Primary Mode**: All members accept both reads and writes simultaneously. Conflicts are detected and resolved automatically, but this mode requires more careful application design.

## How Consensus Works

When a transaction is committed on a group member:
1. The member proposes the transaction to the group via the GCS (Group Communication System).
2. The GCS uses the Paxos-based protocol to deliver the transaction to all group members in the same total order (this step requires a majority of members to be reachable).
3. Each member independently certifies the transaction by checking for write-set conflicts. Since certification is deterministic, all members reach the same commit or abort decision.
4. If a conflict is detected, the conflicting transaction is aborted and returns an error to the client.

This ensures every member has a consistent view of which transactions committed.

## Setting Up Group Replication

In `my.cnf`:

```ini
[mysqld]
server_id = 1
gtid_mode = ON
enforce_gtid_consistency = ON
plugin_load_add = group_replication.so
group_replication_group_name = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
group_replication_start_on_boot = OFF
group_replication_local_address = "node1:33061"
group_replication_group_seeds = "node1:33061,node2:33061,node3:33061"
group_replication_bootstrap_group = OFF
```

Bootstrap and start the first member:

```sql
SET GLOBAL group_replication_bootstrap_group = ON;
START GROUP_REPLICATION;
SET GLOBAL group_replication_bootstrap_group = OFF;
```

Join subsequent members:

```sql
START GROUP_REPLICATION;
```

## Monitoring Group Replication

```sql
SELECT
  MEMBER_ID,
  MEMBER_HOST,
  MEMBER_ROLE,
  MEMBER_STATE
FROM performance_schema.replication_group_members;
```

States include `ONLINE`, `RECOVERING`, `UNREACHABLE`, and `ERROR`.

## Fault Tolerance

A group of N members can tolerate `(N-1)/2` failures while maintaining quorum. Common configurations:

| Members | Tolerated Failures |
|---------|-------------------|
| 3 | 1 |
| 5 | 2 |
| 7 | 3 |

A group that loses quorum enters a network partition state and stops accepting writes to prevent split-brain.

## Relationship to InnoDB Cluster

MySQL InnoDB Cluster uses Group Replication as its replication layer. MySQL Shell provides a higher-level management interface (`dba.createCluster()`, `dba.getCluster()`) that automates Group Replication setup, monitoring, and failover.

## Summary

MySQL Group Replication provides built-in high availability through distributed consensus, automatic failover, and conflict detection. It supports both single-primary and multi-primary topologies, tolerates member failures without manual intervention, and integrates with InnoDB Cluster for simplified management. It is the recommended replication approach for highly available MySQL deployments.

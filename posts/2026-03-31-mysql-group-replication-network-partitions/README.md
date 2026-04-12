# How to Handle Network Partitions in MySQL Group Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Group Replication, Network Partition, Split-Brain, High Availability

Description: Learn how MySQL Group Replication handles network partitions, how to prevent split-brain scenarios, and how to recover a partitioned cluster.

---

## How Group Replication Handles Network Partitions

MySQL Group Replication uses the Paxos-based consensus protocol (XCom) to maintain consistency. When a network partition occurs, nodes that can still communicate with a majority (quorum) continue serving traffic. Nodes that lose quorum block writes and enter an `UNREACHABLE` or `ERROR` state.

For a 3-node cluster, quorum requires at least 2 nodes. If one node becomes isolated, the 2-node partition continues operating while the isolated node suspends itself.

## Detect a Network Partition

```sql
SELECT MEMBER_HOST, MEMBER_STATE
FROM performance_schema.replication_group_members;
```

```text
+---------+-------------+
| node1   | ONLINE      |
| node2   | ONLINE      |
| node3   | UNREACHABLE |
+---------+-------------+
```

An `UNREACHABLE` member means the group suspects the node is unavailable but has not yet made a final decision about expulsion.

## Configure the Expel Timeout

The `group_replication_member_expel_timeout` variable controls how long the group waits before expelling an unreachable member:

```sql
-- Default is 5 seconds; increase for unstable networks
SET GLOBAL group_replication_member_expel_timeout = 10;
```

After the timeout expires, the node is formally removed:

```text
+---------+--------+
| node1   | ONLINE |
| node2   | ONLINE |
+---------+--------+
```

## Prevent Split-Brain with Odd Node Count

Always use an odd number of nodes (3, 5, 7) to ensure a clear majority:

```text
Cluster size  | Nodes needed for quorum
3             | 2
5             | 3
7             | 4
```

With 2 or 4 nodes, a symmetric partition can result in neither side achieving quorum, causing the entire cluster to halt writes.

## Configure Auto-Rejoin

When a node loses connectivity and then recovers, you can configure it to automatically attempt to rejoin:

```sql
-- Number of rejoin attempts (default is 3)
SET GLOBAL group_replication_autorejoin_tries = 3;
```

```ini
# my.cnf - persist the setting
group_replication_autorejoin_tries = 3
```

## Handle a Minority Partition Manually

If a node ends up in a minority partition and refuses to rejoin automatically, force it to leave and rejoin:

```sql
-- On the isolated node
STOP GROUP_REPLICATION;

-- Then restart it (it will join the surviving majority)
START GROUP_REPLICATION;
```

## Prevent Stale Reads on Partitioned Secondaries

In single-primary mode, a secondary that is partitioned may continue serving stale reads. Configure `group_replication_consistency` to block reads until the node has confirmed it is current:

```sql
SET GLOBAL group_replication_consistency = 'BEFORE';
```

Available values:
- `EVENTUAL` (default) - reads proceed immediately, may be stale
- `BEFORE` - reads wait until node is up to date
- `AFTER` - writes wait until all secondaries apply the transaction
- `BEFORE_AND_AFTER` - both read and write blocking

## Recover a Fully Partitioned Cluster

If all nodes lost connectivity simultaneously and none can form a majority, you must force a new group with a single node:

```sql
-- On the most current node (highest GTID set)
-- DANGER: This resets the group view - only do this as last resort
SET GLOBAL group_replication_force_members = 'node1:33061';
```

After the cluster is back online, other nodes can rejoin normally.

## Summary

MySQL Group Replication prevents split-brain by requiring a quorum majority to continue accepting writes. Use an odd number of nodes, configure `group_replication_member_expel_timeout` appropriately for your network, and enable `group_replication_autorejoin_tries` for automatic recovery. For preventing stale reads during partitions, set `group_replication_consistency` to `BEFORE` or higher.

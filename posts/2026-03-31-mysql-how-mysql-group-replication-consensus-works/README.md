# How MySQL Group Replication Consensus Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Group Replication, Paxos, High Availability, Distributed System

Description: Understand how MySQL Group Replication uses the Paxos protocol to achieve distributed consensus, ensuring all members agree on transaction order.

---

## What Is MySQL Group Replication

MySQL Group Replication (GR) is a plugin that forms a distributed group of MySQL servers. All members coordinate using a consensus protocol to ensure that every write applied to one member is applied to all members in the same order.

Group Replication provides:
- **High availability** - automatic failover when a primary fails.
- **Consistency** - no data loss for committed transactions.
- **Multi-primary or single-primary** topology.

## The Consensus Protocol - Paxos

At the core of Group Replication is a modified Paxos algorithm called **XCom** (Extended Paxos Communication). Every transaction that commits must be approved by a quorum of group members before it is applied.

The process for each transaction:

```text
1. Transaction executes on a member (writes happen locally)
2. At COMMIT time, the member broadcasts the write set to all group members via XCom
3. XCom uses Paxos to agree on a total order and delivers the write set to all members
4. Each member independently certifies the transaction against concurrent transactions
5. If no conflict is found, all members apply the transaction in the agreed global order
6. The COMMIT returns success to the client on the originating member
```

## Quorum Requirement

Group Replication requires a majority (quorum) of members to be available:

| Group Size | Tolerated Failures |
|------------|-------------------|
| 1          | 0                 |
| 3          | 1                 |
| 5          | 2                 |
| 7          | 3                 |

With 3 members, 1 failure is tolerated. The formula is: `floor((N/2) + 1)` members needed for quorum.

## Transaction Certification

The certification process is how Group Replication detects conflicts:

```text
1. Member executes the transaction and builds a "write set" (list of primary keys modified)
2. The write set is broadcast to all members via XCom
3. Each member applies the write set to its local certification database
4. If the write set overlaps with a concurrent unresolved transaction, there is a conflict
5. The transaction that arrived earlier wins; the later one is rolled back
```

This is called **optimistic conflict detection** - transactions proceed speculatively and are only rejected at certification if a conflict is found.

## Viewing Group Membership

```sql
SELECT MEMBER_ID, MEMBER_HOST, MEMBER_PORT, MEMBER_STATE, MEMBER_ROLE
FROM performance_schema.replication_group_members;
```

Output:

```text
+--------------------------------------+-------------+-------------+--------------+-------------+
| MEMBER_ID                            | MEMBER_HOST | MEMBER_PORT | MEMBER_STATE | MEMBER_ROLE |
+--------------------------------------+-------------+-------------+--------------+-------------+
| 3d1fcca1-...                         | node1       |        3306 | ONLINE       | PRIMARY     |
| 4e2fcca2-...                         | node2       |        3306 | ONLINE       | SECONDARY   |
| 5f3fcca3-...                         | node3       |        3306 | ONLINE       | SECONDARY   |
+--------------------------------------+-------------+-------------+--------------+-------------+
```

## Monitoring Transaction Flow

```sql
SELECT * FROM performance_schema.replication_group_member_stats\G
```

Key metrics:
- `COUNT_TRANSACTIONS_IN_QUEUE` - transactions waiting for certification.
- `COUNT_TRANSACTIONS_CHECKED` - total certified.
- `COUNT_CONFLICTS_DETECTED` - how many were rolled back due to conflicts.

## Flow Control

When a member falls behind processing the certification queue, Group Replication activates **flow control** to slow down the faster members and allow the lagging member to catch up:

```sql
SHOW VARIABLES LIKE 'group_replication_flow_control_mode';
SHOW VARIABLES LIKE 'group_replication_flow_control_certifier_threshold';
SHOW VARIABLES LIKE 'group_replication_flow_control_applier_threshold';
```

Flow control prevents one slow member from causing unbounded queue growth across the group.

## Single-Primary vs Multi-Primary Mode

### Single-Primary (Default)

One member accepts writes; others are read-only replicas. Primary election happens automatically on failure.

```sql
SELECT group_replication_get_write_concurrency();
```

### Multi-Primary Mode

All members accept writes. Conflicts are detected and resolved via certification. Higher throughput for workloads with non-overlapping data.

```sql
-- Switch to multi-primary (rolling change, online)
SELECT group_replication_switch_to_multi_primary_mode();
```

## Network Partitions and Fencing

If a network partition splits the group, only the side with a quorum continues to accept writes. The minority side cannot process transactions because it lacks a quorum. If `group_replication_unreachable_majority_timeout` is set to a positive value, the minority members will exit the group and report:

```text
MEMBER_STATE = ERROR
```

By default this timeout is 0, meaning the minority side blocks indefinitely waiting for the majority to become reachable again.

```sql
-- On the isolated minority partition
SHOW VARIABLES LIKE 'group_replication_unreachable_majority_timeout';
-- If set to a positive value, the minority exits the group after this timeout
```

## Summary

MySQL Group Replication uses a modified Paxos (XCom) algorithm to guarantee that all members agree on the global transaction order before any commit is finalized. This provides strong consistency guarantees - a committed transaction will never be lost. The quorum requirement means you need an odd number of members (3, 5, 7) for optimal fault tolerance, and flow control prevents fast members from overwhelming slower ones during catch-up.

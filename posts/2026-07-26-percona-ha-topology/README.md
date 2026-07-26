# Percona Async Replication, Group Replication, or XtraDB Cluster: Which HA Topology Fits?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Percona Server, MySQL, High Availability, Replication, XtraDB Cluster

Description: Compare asynchronous replication, MySQL Group Replication, and Percona XtraDB Cluster by recovery guarantees, write behavior, failure handling, and operational cost.

---

There is no universally best high-availability topology for Percona Server. The right choice follows from the failure you must survive, the amount of committed data you can lose, the latency between sites, and whether your application can retry a transaction.

The three common choices solve different problems:

| Topology | Commit path | Normal write endpoint | Main advantage | Main trade-off |
| --- | --- | --- | --- | --- |
| Asynchronous source/replica | Source commits before replicas apply | One source | Simple, efficient, and WAN-friendly | A promoted replica can be behind |
| Group Replication | Group orders and certifies transactions | One primary by default; multi-primary is optional | Membership, election, and consistency are integrated | More constraints and coordination overhead |
| Percona XtraDB Cluster (PXC) | Galera certifies write sets across a primary component | One node is operationally safest; multiple writers are possible | Virtually synchronous replication and automatic node provisioning | Conflict retries, flow control, and LAN-like latency requirements |

All three still need a proxy, router, connector, or application logic. Replication does not move an existing client connection to a healthy server.

## Choose Asynchronous Replication for Simplicity and Distance

Traditional source/replica replication is usually the easiest topology to understand and troubleshoot. The source writes binary log events and replicas fetch and apply them. This decoupling makes it suitable for read replicas, delayed replicas, backup replicas, and cross-region disaster recovery.

It does not, by itself, guarantee zero data loss. A source can acknowledge a transaction that has not reached or been applied by the future promotion candidate. Semi-synchronous replication can narrow that window, but acknowledgement by a replica is not the same as application of the transaction.

Use asynchronous replication when:

- a small, measured recovery point objective is acceptable;
- replicas are separated by WAN latency;
- operational simplicity matters more than automatic consensus;
- read scaling, delayed recovery, or an isolated backup replica is important;
- failover is controlled by an external orchestrator or runbook.

Before promotion, inspect both transport and apply state:

```sql
SHOW REPLICA STATUS\G
```

Do not make `Seconds_Behind_Source` the only gate. Also check the receiver and applier error fields, retrieved and executed GTID sets, relay-log health, and whether the old source is fenced. Promotion without fencing can create two writable servers and divergent histories.

## Choose Group Replication for Integrated Membership and Election

MySQL Group Replication is available with Percona Server because Percona Server is compatible with the upstream MySQL replication stack. It uses group membership and transaction certification to maintain a fault-tolerant group.

Single-primary mode is the default and is normally the safest application model: one member is read/write and the others are `super_read_only`. If the primary leaves, an eligible member can be elected. Multi-primary mode lets all members accept writes, but concurrent writes can conflict, and MySQL documents additional limitations such as cascading foreign-key restrictions and distributed-lock caveats.

Use Group Replication when:

- you want automatic membership and primary election;
- all members can live on a low-latency, reliable network;
- GTID-based operation and Group Replication's requirements fit the schema;
- the application can reconnect through MySQL Router or another proxy;
- your team prefers upstream MySQL HA semantics over Galera semantics.

Check the group view and member roles directly:

```sql
SELECT MEMBER_ID, MEMBER_HOST, MEMBER_PORT, MEMBER_STATE, MEMBER_ROLE
FROM performance_schema.replication_group_members;

SELECT *
FROM performance_schema.replication_group_member_stats\G
```

A member being `ONLINE` is necessary, but it is not a complete service check. Monitor certification conflicts, applier queues, flow control, and the router's view. MySQL Group Replication supports at most nine members, and it requires a majority to make progress.

## Choose PXC for a Galera-Based, Virtually Synchronous Cluster

Percona XtraDB Cluster packages Percona Server with Galera write-set replication. Transactions execute locally, then their write sets are certified and replicated. PXC documentation describes this as virtually synchronous: nodes maintain a consistent cluster state, but it is not a distributed shared-lock manager.

PXC is a strong fit when:

- the recovery point objective inside one low-latency site is effectively zero;
- automatic state transfer for joining nodes is valuable;
- the workload is mostly InnoDB and uses primary keys consistently;
- clients can retry certification failures such as error 1213;
- all voting nodes have comparable capacity.

Use an odd number of voting members; three is the common minimum. Two data nodes plus `garbd` can provide a third vote, but the arbitrator stores no data and does not add restore capacity. A proxy such as ProxySQL is still required to route around failed or desynchronized nodes.

Inspect the cluster component before treating a node as writable:

```sql
SHOW GLOBAL STATUS WHERE Variable_name IN (
  'wsrep_cluster_status',
  'wsrep_cluster_size',
  'wsrep_connected',
  'wsrep_ready',
  'wsrep_local_state_comment',
  'wsrep_flow_control_paused'
);
```

The healthy write state is a `Primary` component with `wsrep_ready=ON`, `wsrep_connected=ON`, and the local node `Synced`. A slow member can trigger flow control and limit the whole cluster. PXC also requires InnoDB for replicated writes, does not support every MySQL locking pattern, and can reject one of two conflicting transactions at commit.

## Decide with Failure Scenarios, Not Feature Lists

Run the design through concrete failures:

1. **One database process dies.** Who detects it, fences it, and changes the endpoint?
2. **A host or availability zone disappears.** Is a majority still available?
3. **The network splits.** Which side remains writable, and how is the other side prevented from serving writes?
4. **A human deletes data.** HA will replicate the mistake; where are the immutable backups or delayed replicas?
5. **A node is rebuilt.** How long do SST, distributed recovery, or backup restore take at production data size?
6. **The proxy fails.** Is the routing layer itself redundant?
7. **The application gets an ambiguous commit or deadlock.** Is the operation idempotent and safely retryable?

These tests often lead to a layered design. For example, a three-node PXC or Group Replication cluster can handle local node failure, while asynchronous replication carries data to a remote disaster-recovery site. That remote copy should not be added casually to the low-latency consensus group.

## A Practical Selection Rule

Start with asynchronous replication if it meets the measured RPO and RTO. Select single-primary Group Replication when integrated election and group membership justify the extra constraints. Select PXC when Galera's virtually synchronous behavior, state transfer, and Percona operational tooling match an InnoDB workload and a low-latency site.

Whichever topology wins, document:

- the authoritative write endpoint;
- quorum and fencing rules;
- transaction retry behavior;
- maximum tested replication lag or apply queue;
- backup and point-in-time recovery procedures;
- exact failover and failback gates.

High availability is demonstrated by rehearsed failure behavior, not by the number of database nodes.

## Official Documentation

- [Percona XtraDB Cluster high availability](https://docs.percona.com/percona-xtradb-cluster/8.4/high-availability.html)
- [Percona XtraDB Cluster limitations](https://docs.percona.com/percona-xtradb-cluster/8.4/limitation.html)
- [MySQL 8.4 Group Replication](https://dev.mysql.com/doc/refman/8.4/en/group-replication.html)
- [MySQL Group Replication single-primary and multi-primary modes](https://dev.mysql.com/doc/refman/8.4/en/group-replication-deploying-in-multi-primary-or-single-primary-mode.html)
- [MySQL replication configuration](https://dev.mysql.com/doc/refman/8.4/en/replication-configuration.html)

# How to Set Up MySQL InnoDB ClusterSet for Disaster Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB ClusterSet, Disaster Recovery, MySQL Shell, Replication

Description: Configure MySQL InnoDB ClusterSet to link multiple InnoDB Clusters across data centers for geographic redundancy and disaster recovery failover.

---

## What Is InnoDB ClusterSet

MySQL InnoDB ClusterSet links multiple InnoDB Clusters together in a primary-replica topology. One cluster is designated as the primary cluster, handling all writes. Replica clusters receive asynchronous replication from the primary and can be promoted during a disaster recovery scenario.

This differs from InnoDB Cluster (which uses virtually synchronous Group Replication within a single data center) - ClusterSet adds cross-datacenter replication with controlled failover.

## Prerequisites

- MySQL 8.0.27+ on all nodes
- Primary InnoDB Cluster already running and healthy
- At least one additional cluster (or standalone instances) in a secondary data center
- Network connectivity between data centers on port 3306

## Create the ClusterSet

Connect to MySQL Shell and create a ClusterSet from the existing primary cluster:

```javascript
shell.connect('admin@primary-node1:3306')
var cluster = dba.getCluster()
var clusterSet = cluster.createClusterSet('myClusterSet')
```

## Create the Replica Cluster

Create a replica cluster in the secondary data center:

```javascript
var replicaCluster = clusterSet.createReplicaCluster(
  'admin@dr-node1:3306',
  'drCluster'
)
```

MySQL Shell will automatically configure asynchronous replication from the primary cluster to the replica cluster.

Add additional instances to the replica cluster for local redundancy:

```javascript
replicaCluster.addInstance('admin@dr-node2:3306')
replicaCluster.addInstance('admin@dr-node3:3306')
```

## Check ClusterSet Status

```javascript
clusterSet.status()
```

```text
{
    "domainName": "myClusterSet",
    "primaryCluster": "myCluster",
    "status": "HEALTHY",
    "clusters": {
        "myCluster": {
            "clusterRole": "PRIMARY",
            "globalStatus": "OK",
            "primary": "primary-node1:3306"
        },
        "drCluster": {
            "clusterRole": "REPLICA",
            "globalStatus": "OK",
            "clusterErrors": []
        }
    }
}
```

## Monitor Replication Lag

The replica cluster receives asynchronous replication, so there will be some lag:

```sql
-- Run on the replica cluster primary
SHOW REPLICA STATUS\G
```

```text
Seconds_Behind_Source: 2
```

A high lag means the replica cluster is behind and may have data loss during unplanned failover.

## Perform a Planned Failover (Controlled Switchover)

For planned maintenance, promote the replica cluster gracefully:

```javascript
clusterSet.setPrimaryCluster('drCluster')
```

This flushes all pending transactions to the replica before switching. The original primary becomes a replica.

## Perform an Emergency Failover

If the primary cluster is lost and unrecoverable, force a failover:

```javascript
clusterSet.forcePrimaryCluster('drCluster')
```

This immediately promotes the replica cluster. Some transactions that were not yet replicated may be lost. The old primary cluster is automatically marked as INVALIDATED. After it recovers, rejoin it as a replica:

```javascript
clusterSet.rejoinCluster('myCluster')
```

## Remove a Replica Cluster

```javascript
clusterSet.removeCluster('drCluster')
```

## Summary

MySQL InnoDB ClusterSet enables geographic redundancy by linking multiple InnoDB Clusters with asynchronous replication. Create the set with `cluster.createClusterSet()`, add replica clusters with `clusterSet.createReplicaCluster()`, and use `clusterSet.setPrimaryCluster()` for planned failover or `clusterSet.forcePrimaryCluster()` for emergency promotion. Monitor replication lag to understand potential data loss exposure during unplanned failover.

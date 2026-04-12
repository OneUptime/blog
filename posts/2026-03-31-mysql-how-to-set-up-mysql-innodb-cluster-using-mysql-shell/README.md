# How to Set Up MySQL InnoDB Cluster Using MySQL Shell

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB Cluster, MySQL Shell, High Availability

Description: Step-by-step guide to creating a MySQL InnoDB Cluster with three nodes using MySQL Shell's AdminAPI for automatic failover and high availability.

---

## What Is MySQL InnoDB Cluster

MySQL InnoDB Cluster is a built-in high availability solution that combines:

- **MySQL Group Replication** - virtually synchronous multi-primary or single-primary replication
- **MySQL Shell AdminAPI** - management interface
- **MySQL Router** - transparent client routing with automatic failover

## Prerequisites

- Three or more MySQL 8.0+ servers (or VMs/containers)
- MySQL Shell installed on each node
- MySQL Router installed on application servers
- Unique `server_id` on each node
- All nodes able to reach each other on port 3306 and 33061 (Group Replication)

## Step 1 - Prepare Each Node

Run this on every node using MySQL Shell:

```bash
mysqlsh root@node1:3306
```

```javascript
dba.configureInstance('root@node1:3306', {clusterAdmin: 'clusteradmin', clusterAdminPassword: 'adminpass'})
```

Repeat for `node2` and `node3`. The wizard may prompt you to restart MySQL to apply required settings.

## Step 2 - Create the Cluster

Connect to the node that will be the initial primary:

```bash
mysqlsh clusteradmin@node1:3306
```

```javascript
var cluster = dba.createCluster('myCluster')
```

Expected output:

```text
A new InnoDB Cluster will be created on instance 'node1:3306'.

Validating instance configuration at node1:3306...
Creating InnoDB Cluster 'myCluster' on 'node1:3306'...
Adding Seed Instance...
Cluster successfully created.
```

## Step 3 - Add Other Nodes

```javascript
cluster.addInstance('clusteradmin@node2:3306')
cluster.addInstance('clusteradmin@node3:3306')
```

MySQL Shell will clone or synchronize the data automatically. Accept the default `clone` recovery method when prompted.

## Step 4 - Check Cluster Status

```javascript
cluster.status()
```

```text
{
    "clusterName": "myCluster",
    "defaultReplicaSet": {
        "name": "default",
        "primary": "node1:3306",
        "ssl": "REQUIRED",
        "status": "OK",
        "statusText": "Cluster is ONLINE and can tolerate up to ONE failure.",
        "topology": {
            "node1:3306": { "mode": "R/W", "status": "ONLINE" },
            "node2:3306": { "mode": "R/O", "status": "ONLINE" },
            "node3:3306": { "mode": "R/O", "status": "ONLINE" }
        }
    }
}
```

## Step 5 - Bootstrap MySQL Router

On the application server (or any node), bootstrap MySQL Router against the cluster:

```bash
mysqlrouter --bootstrap clusteradmin@node1:3306 --user=mysqlrouter
mysqlrouter &
```

Router will automatically discover the cluster topology and expose:

- Port 6446 - read/write (primary)
- Port 6447 - read-only (replicas)

## Cluster Management Commands

```javascript
// Get reference to existing cluster
var cluster = dba.getCluster()

// Remove a node
cluster.removeInstance('clusteradmin@node3:3306')

// Rejoin a node that left
cluster.rejoinInstance('clusteradmin@node3:3306')

// Force quorum if majority is lost
cluster.forceQuorumUsingPartitionOf('clusteradmin@node1:3306')

// Dissolve cluster
cluster.dissolve()
```

## Summary

Setting up MySQL InnoDB Cluster requires running `dba.configureInstance()` on each node, creating the cluster with `dba.createCluster()`, and adding members with `cluster.addInstance()`. The result is a fault-tolerant three-node cluster with automatic primary election, managed through MySQL Shell's AdminAPI.

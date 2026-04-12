# How to Understand MySQL NDB Cluster Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NDB Cluster, High Availability, Distributed Database, Clustering

Description: Learn the core components and architecture of MySQL NDB Cluster, including data nodes, management nodes, and SQL nodes.

---

## What is MySQL NDB Cluster?

MySQL NDB Cluster is a distributed, shared-nothing database architecture designed for high availability and high throughput. It uses the NDB (Network DataBase) storage engine and distributes data across multiple nodes with automatic failover.

Key characteristics:
- In-memory with optional disk persistence
- Synchronous replication between data nodes
- No single point of failure
- Linear scalability

## Core Components

MySQL NDB Cluster consists of three types of nodes:

### Management Nodes (ndb_mgmd)

Management nodes control the cluster configuration and monitor the state of other nodes. They do not store data.

```text
ndb_mgmd --config-file=/etc/mysql-cluster/config.ini
```

There is typically one or two management nodes per cluster for redundancy.

### Data Nodes (ndbd / ndbmtd)

Data nodes store the actual data using the NDB storage engine. Data is automatically partitioned (sharded) across data nodes, and each partition is replicated to at least one other node.

```text
ndbd --connect-string=mgm-node-ip:1186
```

Use `ndbmtd` (multi-threaded) for production workloads with multiple CPU cores.

### SQL Nodes (mysqld)

SQL nodes are standard MySQL server instances configured to use the NDB storage engine. Applications connect to SQL nodes and issue standard SQL queries.

```text
[mysqld]
ndbcluster
ndb-connectstring=mgm-node-ip
```

## Data Distribution: Partitioning and Replication

NDB Cluster automatically partitions tables across data nodes. The number of partitions is determined by the number of data nodes and the `NoOfReplicas` setting.

```text
# config.ini snippet
[ndbd default]
NoOfReplicas=2
DataMemory=512M
```

With `NoOfReplicas=2`, each partition is stored on two nodes. If one node fails, the cluster continues serving data from the replica.

## Example: Minimal Cluster Configuration

```ini
# /etc/mysql-cluster/config.ini

[ndb_mgmd]
hostname=192.168.1.10
datadir=/var/lib/mysql-cluster

[ndbd]
hostname=192.168.1.11
datadir=/var/lib/mysql

[ndbd]
hostname=192.168.1.12
datadir=/var/lib/mysql

[mysqld]
hostname=192.168.1.13

[mysqld]
hostname=192.168.1.14
```

## Starting the Cluster

Start nodes in this order: management nodes first, then data nodes, then SQL nodes.

```bash
# On management node
ndb_mgmd --config-file=/etc/mysql-cluster/config.ini --initial

# On each data node
ndbd --connect-string=192.168.1.10:1186 --initial

# On each SQL node
mysqld_safe --user=mysql &
```

## Verifying Cluster Status

```bash
# Connect to management node
ndb_mgm -e "show"
```

Expected output:

```text
Cluster Configuration
---------------------
[ndbd(NDB)]     2 node(s)
id=2    @192.168.1.11  (mysql-8.0.32 ndb-8.0.32, Nodegroup: 0, *)
id=3    @192.168.1.12  (mysql-8.0.32 ndb-8.0.32, Nodegroup: 0)

[ndb_mgmd(MGM)] 1 node(s)
id=1    @192.168.1.10  (mysql-8.0.32 ndb-8.0.32)

[mysqld(API)]   2 node(s)
id=4    @192.168.1.13  (mysql-8.0.32 ndb-8.0.32)
id=5    @192.168.1.14  (mysql-8.0.32 ndb-8.0.32)
```

## Creating NDB Tables

```sql
CREATE TABLE orders (
    order_id INT NOT NULL AUTO_INCREMENT,
    customer_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (order_id)
) ENGINE=NDBCLUSTER;
```

Note: NDB tables require a primary key. Without one, MySQL adds a hidden primary key.

## Memory Management

NDB stores data primarily in memory. Monitor memory usage with:

```sql
SELECT node_id, memory_type, used, total,
       ROUND(used/total*100, 2) AS pct_used
FROM ndbinfo.memoryusage;
```

## Limitations to Know

- Foreign keys supported since NDB Cluster 7.3, but with some restrictions (e.g., SET DEFAULT not supported)
- JOINs involving non-partitioning keys require full table scans across nodes
- Large transactions can be slow due to synchronous replication overhead
- Tables must fit in data node memory (DataMemory setting)

## Summary

MySQL NDB Cluster provides a distributed shared-nothing architecture with three node types: management nodes for coordination, data nodes for storage with automatic replication, and SQL nodes for application connectivity. Data is automatically partitioned and replicated across data nodes, ensuring high availability with no single point of failure. Understanding this architecture is essential before deploying or troubleshooting NDB Cluster in production.

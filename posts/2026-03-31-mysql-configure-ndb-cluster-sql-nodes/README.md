# How to Configure MySQL NDB Cluster SQL Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NDB Cluster, SQL Node, Configuration, mysqld

Description: Learn how to configure MySQL SQL nodes in NDB Cluster to enable the ndbcluster storage engine and connect them to the cluster management node.

---

## Role of SQL Nodes

SQL nodes in NDB Cluster are standard MySQL server instances (`mysqld`) with the NDB storage engine plugin loaded. They provide the SQL interface for applications connecting to the cluster. Multiple SQL nodes can run simultaneously, giving horizontal read/write scalability. SQL nodes do not store data themselves - they forward operations to data nodes.

## SQL Node my.cnf Configuration

On each SQL node host, configure `/etc/mysql/my.cnf`:

```text
[mysqld]
# Standard MySQL settings
datadir=/var/lib/mysql
socket=/var/run/mysqld/mysqld.sock
user=mysql
port=3306

# NDB Cluster settings
ndbcluster
ndb-connectstring=192.168.1.10

[mysql_cluster]
ndb-connectstring=192.168.1.10
```

The critical settings are:
- `ndbcluster` - enables the NDB storage engine
- `ndb-connectstring` - points to the management node IP or hostname

## Management Node config.ini Entry for SQL Nodes

Each SQL node must have a matching `[mysqld]` entry in the management node's `config.ini`:

```text
[mysqld]
NodeId=4
hostname=192.168.1.13

[mysqld]
NodeId=5
hostname=192.168.1.14
```

## Starting the SQL Node

```bash
sudo systemctl start mysql
```

Or:

```bash
mysqld_safe --user=mysql &
```

## Verifying NDB Engine is Loaded

After connecting to the SQL node:

```sql
SHOW ENGINES;
```

Look for:

```text
Engine  | Support | Comment
NDBCLUSTER | YES | Clustered, fault-tolerant tables
```

## Creating an NDB Table

```sql
CREATE DATABASE clusterdb;
USE clusterdb;

CREATE TABLE orders (
    id         INT NOT NULL AUTO_INCREMENT,
    customer   VARCHAR(100) NOT NULL,
    amount     DECIMAL(10,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id)
) ENGINE=NDBCLUSTER;
```

## Verifying Cluster Connectivity

```sql
SHOW STATUS LIKE 'Ndb_cluster_node_id';
```

A non-zero value confirms the SQL node is connected to the cluster:

```text
Variable_name       | Value
Ndb_cluster_node_id | 4
```

Check the number of data nodes visible:

```sql
SHOW STATUS LIKE 'Ndb_number_of_data_nodes';
```

## SQL Node-Specific Tuning

Add these to `my.cnf` for better SQL node performance:

```text
[mysqld]
ndbcluster
ndb-connectstring=192.168.1.10

# Increase API batch sizes (default is 32768)
ndb-batch-size=65536

# Allow more concurrent NDB transactions
ndb-cluster-connection-pool=2

# Assign specific API node IDs to pool connections
ndb-cluster-connection-pool-nodeids=4,5
```

## Checking Connected SQL Nodes

From the management node:

```bash
ndb_mgm -e show
```

Connected SQL nodes show:

```text
[mysqld(API)]   2 node(s)
id=4    @192.168.1.13  (mysql-8.0.36 ndb-8.0.36)
id=5    @192.168.1.14  (mysql-8.0.36 ndb-8.0.36)
```

## Summary

SQL nodes are standard MySQL servers with the NDB engine enabled via `ndbcluster` in `my.cnf` and a connection string pointing to the management node. After starting, verify the NDB engine shows as `YES` in `SHOW ENGINES` and `Ndb_cluster_node_id` returns a non-zero value. Create tables with `ENGINE=NDBCLUSTER` to store them in the distributed cluster rather than on local disk.

# How to Add Nodes to a MySQL NDB Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NDB Cluster, Scaling, Node, Configuration

Description: Learn how to add new data nodes and SQL nodes to a running MySQL NDB Cluster without shutting down the entire cluster.

---

## Overview

MySQL NDB Cluster supports adding new data nodes and SQL nodes to a running cluster. Adding data nodes requires updating the cluster configuration, starting the new nodes, creating a new node group, and then redistributing data using `ALTER TABLE ... REORGANIZE PARTITION`. Adding SQL nodes is simpler and requires only connecting the new node to the management node.

## Adding a New SQL Node (API Node)

Adding a new SQL node is non-disruptive. First, add the new node to `config.ini` on the management node:

```text
[mysqld]
NodeId=6
hostname=192.168.1.15
```

Stop and restart the management node to pick up the new configuration:

```bash
ndb_mgm -e "1 stop"
ndb_mgmd --reload --config-file=/var/lib/mysql-cluster/config.ini
```

Configure the new SQL node host's `/etc/mysql/my.cnf`:

```text
[mysqld]
ndbcluster
ndb-connectstring=192.168.1.10

[mysql_cluster]
ndb-connectstring=192.168.1.10
```

Start MySQL on the new host:

```bash
systemctl start mysql
```

Verify it joined:

```bash
ndb_mgm -e show
```

## Adding New Data Nodes

Adding data nodes requires more careful planning. Data nodes in NDB Cluster are organized into node groups. A new node group requires adding two data nodes simultaneously (for `NoOfReplicas=2`).

### Step 1: Update config.ini

Add the new data node entries to the management node's `config.ini`:

```text
[ndbd]
NodeId=4
hostname=192.168.1.15
datadir=/usr/local/mysql/data

[ndbd]
NodeId=5
hostname=192.168.1.16
datadir=/usr/local/mysql/data
```

### Step 2: Stop and Restart Management Node

Stop the running management node, then restart it with `--reload` to pick up the new configuration:

```bash
ndb_mgm -e "1 stop"
ndb_mgmd --reload --config-file=/var/lib/mysql-cluster/config.ini
```

### Step 3: Install and Configure the New Data Node Hosts

On each new data node host, install the NDB data node package and configure `my.cnf`:

```text
[mysql_cluster]
ndb-connectstring=192.168.1.10
```

### Step 4: Start New Data Nodes with --initial

```bash
ndbd --initial
```

The `--initial` flag is required for new data nodes that have no existing data.

### Step 5: Verify the New Nodes Joined

```bash
ndb_mgm -e show
```

New nodes appear in the output as a new node group.

### Step 6: Create the New Node Group

Assign the new data nodes to a node group so they can begin storing data:

```bash
ndb_mgm -e "CREATE NODEGROUP 4,5"
```

### Step 7: Redistribute Data (Online Rebalancing)

After adding data nodes, existing data is not automatically redistributed. Use `ALTER TABLE ... REORGANIZE PARTITION` on each NDB table:

```sql
USE mydb;
ALTER TABLE orders REORGANIZE PARTITION;
ALTER TABLE customers REORGANIZE PARTITION;
ALTER TABLE products REORGANIZE PARTITION;
```

Then optimize to reclaim space:

```sql
OPTIMIZE TABLE orders, customers, products;
```

## Verifying Node Group Assignment

```bash
ndb_mgm> show
```

New data nodes appear as a new node group:

```text
[ndbd(NDB)]     4 node(s)
id=2    @192.168.1.11  (Nodegroup: 0, *)
id=3    @192.168.1.12  (Nodegroup: 0)
id=4    @192.168.1.15  (Nodegroup: 1, *)
id=5    @192.168.1.16  (Nodegroup: 1)
```

## Summary

Adding SQL nodes to NDB Cluster is near-instant and non-disruptive. Adding data nodes requires updating `config.ini`, reloading the management node, starting new data nodes with `--initial`, creating the new node group with `CREATE NODEGROUP`, and then running `ALTER TABLE ... REORGANIZE PARTITION` on all NDB tables to redistribute data across the expanded cluster. Plan node additions carefully to maintain the required node group pairing for redundancy.

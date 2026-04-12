# How to Configure MySQL NDB Cluster Data Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NDB Cluster, Data Node, Configuration, Storage

Description: Learn how to configure MySQL NDB Cluster data nodes using my.cnf and config.ini parameters to set memory, storage, and connection settings.

---

## Role of Data Nodes

Data nodes (`ndbd` for single-threaded, `ndbmtd` for multi-threaded) store and manage the actual table data in NDB Cluster. They communicate directly with each other to maintain replicas and handle failover. Each data node connects to the management node at startup to retrieve configuration, then joins the cluster.

## Data Node Configuration in config.ini

The management node's `config.ini` contains the primary data node settings under `[ndbd default]` and individual `[ndbd]` sections:

```text
[ndbd default]
NoOfReplicas=2
DataMemory=1G
MaxNoOfConcurrentOperations=200000
MaxNoOfTables=1024
MaxNoOfAttributes=10000
MaxNoOfOrderedIndexes=2048
MaxNoOfUniqueHashIndexes=1024
TimeBetweenWatchDogCheckInitial=30000
TransactionBufferMemory=32M
```

Individual node sections:

```text
[ndbd]
NodeId=2
hostname=192.168.1.11
datadir=/usr/local/mysql/data
BackupDataDir=/backup/mysql-cluster

[ndbd]
NodeId=3
hostname=192.168.1.12
datadir=/usr/local/mysql/data
BackupDataDir=/backup/mysql-cluster
```

## Data Node my.cnf Configuration

On each data node host, create `/etc/my.cnf`:

```text
[mysql_cluster]
ndb-connectstring=192.168.1.10
```

This tells the data node where to find the management node.

## Starting a Data Node

```bash
# First start (initializes data directory)
ndbd --initial

# Subsequent starts
ndbd

# Multi-threaded data node (recommended for production)
ndbmtd --initial
```

## Creating a systemd Service for Data Nodes

```text
[Unit]
Description=MySQL NDB Cluster Data Node
After=network.target

[Service]
Type=forking
ExecStart=/usr/sbin/ndbmtd
ExecStop=/usr/bin/ndb_mgm -e "2 stop"
User=mysql
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Save to `/etc/systemd/system/ndbd.service`:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ndbd
sudo systemctl start ndbd
```

## Verifying Data Node Status

From the management node:

```bash
ndb_mgm -e show
```

Healthy data nodes show:

```text
[ndbd(NDB)]     2 node(s)
id=2    @192.168.1.11  (mysql-8.0.36 ndb-8.0.36, Nodegroup: 0, *)
id=3    @192.168.1.12  (mysql-8.0.36 ndb-8.0.36, Nodegroup: 0)
```

The `*` marks the master data node in the node group.

## Checking Memory Usage

Connect to the management client and check memory allocation:

```bash
ndb_mgm
ndb_mgm> ALL REPORT MEMORY
```

Output shows `DataMemory` and `IndexMemory` usage percentages for each node.

## Tuning ndbmtd Thread Count

For multi-threaded data nodes, set the number of LDM (Local Data Manager) threads in `config.ini`:

```text
[ndbd]
NodeId=2
hostname=192.168.1.11
datadir=/usr/local/mysql/data
MaxNoOfExecutionThreads=8
```

## Summary

Data nodes are the storage backbone of NDB Cluster. Set `DataMemory` to fit your entire working dataset (data and indexes) in memory (NDB is primarily an in-memory engine), configure `ndb-connectstring` in each node's `my.cnf` to point at the management node, and prefer `ndbmtd` over `ndbd` for multi-core systems. Always start data nodes after the management node and verify their status with `ndb_mgm -e show`.

# How to Configure MySQL NDB Cluster Management Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, NDB Cluster, Management Node, Configuration, High Availability

Description: Learn how to configure the MySQL NDB Cluster management node using config.ini to define the cluster topology, nodes, and key parameters.

---

## Role of the Management Node

The management node (`ndb_mgmd`) is the configuration server for the entire NDB Cluster. It stores the cluster topology in a `config.ini` file and distributes this configuration to all data nodes and SQL nodes when they connect. There is typically one management node per cluster (or two for redundancy). The management node does not store or process data - it coordinates the cluster.

## Default Configuration File Location

```bash
sudo mkdir -p /var/lib/mysql-cluster
sudo vi /var/lib/mysql-cluster/config.ini
```

## Minimal config.ini Example

A 2-data-node, 2-SQL-node cluster configuration:

```text
[ndbd default]
NoOfReplicas=2
DataMemory=512M

[ndb_mgmd]
NodeId=1
hostname=192.168.1.10
datadir=/var/lib/mysql-cluster

[ndbd]
NodeId=2
hostname=192.168.1.11
datadir=/usr/local/mysql/data

[ndbd]
NodeId=3
hostname=192.168.1.12
datadir=/usr/local/mysql/data

[mysqld]
NodeId=4
hostname=192.168.1.13

[mysqld]
NodeId=5
hostname=192.168.1.14
```

## Key Parameters in [ndbd default]

```text
NoOfReplicas=2        # Number of copies of each data fragment (2 = 1 extra replica)
DataMemory=512M       # Memory for storing table data and indexes
MaxNoOfConcurrentOperations=100000
MaxNoOfTables=1024
```

## Starting the Management Node

```bash
ndb_mgmd --config-file=/var/lib/mysql-cluster/config.ini --initial
```

The `--initial` flag clears old configuration state. Only use it on first start or when changing the configuration:

```bash
# Subsequent starts (without --initial)
ndb_mgmd --config-file=/var/lib/mysql-cluster/config.ini
```

## Creating a systemd Service for the Management Node

```text
[Unit]
Description=MySQL NDB Cluster Management Node
After=network.target

[Service]
Type=forking
ExecStart=/usr/sbin/ndb_mgmd --config-file=/var/lib/mysql-cluster/config.ini
ExecStop=/bin/kill -TERM $MAINPID
User=mysql
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Save to `/etc/systemd/system/ndb_mgmd.service` and enable:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ndb_mgmd
sudo systemctl start ndb_mgmd
```

## Verifying the Management Node is Running

```bash
ndb_mgm -e show
```

Expected output when only the management node is up:

```text
Connected to Management Server at: 192.168.1.10:1186
Cluster Configuration
---------------------
[ndbd(NDB)]     2 node(s)
id=2    @192.168.1.11  (not connected, accepting connect)
id=3    @192.168.1.12  (not connected, accepting connect)

[ndb_mgmd(MGM)] 1 node(s)
id=1    @192.168.1.10  (mysql-8.0.36 ndb-8.0.36)

[mysqld(API)]   2 node(s)
id=4    @192.168.1.13  (not connected, accepting connect)
id=5    @192.168.1.14  (not connected, accepting connect)
```

## Summary

The management node's `config.ini` defines every aspect of the NDB Cluster topology. Set `NoOfReplicas=2` for production to ensure data survives a single node failure, allocate `DataMemory` based on your dataset size, and assign unique `NodeId` values to each node. Start the management node first before bringing up data nodes or SQL nodes.

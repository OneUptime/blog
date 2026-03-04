# How to Set Up a High-Availability MariaDB Galera Cluster on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MariaDB, Galera, High Availability, Clustering, Database

Description: Set up a multi-master MariaDB Galera Cluster on RHEL for synchronous replication and automatic node recovery, providing true high availability for your databases.

---

MariaDB Galera Cluster provides synchronous multi-master replication, meaning every node can accept both reads and writes. When a node fails, the remaining nodes continue serving traffic without any manual intervention.

This guide covers setting up a three-node Galera Cluster on RHEL 9.

## Install MariaDB on All Nodes

```bash
# Install MariaDB server and Galera packages on all three nodes
sudo dnf install -y mariadb-server mariadb-server-galera galera

# Run the security script on each node
sudo mysql_secure_installation
```

## Configure the First Node (Bootstrap Node)

Edit the Galera configuration file:

```bash
# /etc/my.cnf.d/galera.cnf
[galera]
wsrep_on=ON
wsrep_provider=/usr/lib64/galera/libgalera_smm.so

# Comma-separated list of all node IPs
wsrep_cluster_address="gcomm://192.168.1.10,192.168.1.11,192.168.1.12"

# Unique name for the cluster
wsrep_cluster_name="rhel_galera_cluster"

# Current node's IP address
wsrep_node_address="192.168.1.10"
wsrep_node_name="node1"

# State Snapshot Transfer method
wsrep_sst_method=rsync

# InnoDB settings required for Galera
binlog_format=ROW
default_storage_engine=InnoDB
innodb_autoinc_lock_mode=2
innodb_doublewrite=1
```

## Bootstrap the Cluster

```bash
# On node1 only, bootstrap the cluster
sudo galera_new_cluster

# Verify the cluster size
mysql -u root -p -e "SHOW STATUS LIKE 'wsrep_cluster_size';"
# Expected output: wsrep_cluster_size = 1
```

## Join Remaining Nodes

Copy the same `galera.cnf` to node2 and node3, updating `wsrep_node_address` and `wsrep_node_name` for each node. Then start MariaDB normally:

```bash
# On node2 and node3, just start MariaDB (do NOT bootstrap)
sudo systemctl start mariadb

# Verify cluster size from any node
mysql -u root -p -e "SHOW STATUS LIKE 'wsrep_cluster_size';"
# Expected output: wsrep_cluster_size = 3
```

## Open Firewall Ports

```bash
# Galera requires these ports on all nodes
sudo firewall-cmd --permanent --add-port=3306/tcp   # MySQL client connections
sudo firewall-cmd --permanent --add-port=4567/tcp   # Galera cluster replication
sudo firewall-cmd --permanent --add-port=4568/tcp   # Incremental State Transfer
sudo firewall-cmd --permanent --add-port=4444/tcp   # State Snapshot Transfer
sudo firewall-cmd --reload
```

## Verify Replication

```bash
# Create a table on node1
mysql -u root -p -e "CREATE DATABASE testdb; USE testdb; CREATE TABLE t1 (id INT PRIMARY KEY);"

# Check it appears on node2
mysql -u root -p -e "SHOW DATABASES LIKE 'testdb';"
```

## Check Cluster Health

```bash
# Key status variables to monitor
mysql -u root -p -e "
SHOW STATUS LIKE 'wsrep_cluster_size';
SHOW STATUS LIKE 'wsrep_cluster_status';
SHOW STATUS LIKE 'wsrep_connected';
SHOW STATUS LIKE 'wsrep_ready';
"
```

A healthy cluster shows `wsrep_cluster_status = Primary`, `wsrep_connected = ON`, and `wsrep_ready = ON`. If a node goes down, the cluster continues operating and the node automatically resyncs when it comes back.

# How to Configure MariaDB Galera Cluster for High Availability on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MariaDB, Galera, High Availability, Multi-Master, Replication

Description: Deploy a three-node MariaDB Galera Cluster on RHEL for synchronous multi-master replication with automatic node joining and conflict resolution.

---

Galera Cluster for MariaDB provides synchronous multi-master replication. Every node can handle reads and writes simultaneously. When a node fails, the cluster continues operating with the remaining nodes, and the failed node resyncs automatically when it returns.

## Install on All Three Nodes

```bash
# Install MariaDB and Galera on all nodes
sudo dnf install -y mariadb-server mariadb-server-galera galera
```

## Configure Node 1 (Bootstrap Node)

```bash
sudo tee /etc/my.cnf.d/galera.cnf << 'EOF'
[galera]
# Enable wsrep replication
wsrep_on=ON
wsrep_provider=/usr/lib64/galera/libgalera_smm.so

# Cluster connection string (all node IPs)
wsrep_cluster_address="gcomm://10.0.0.1,10.0.0.2,10.0.0.3"

# Cluster and node identification
wsrep_cluster_name="rhel_galera"
wsrep_node_address="10.0.0.1"
wsrep_node_name="galera-node1"

# State transfer method
wsrep_sst_method=rsync

# Required InnoDB settings for Galera
binlog_format=ROW
default_storage_engine=InnoDB
innodb_autoinc_lock_mode=2
innodb_doublewrite=1

# Performance tuning
innodb_buffer_pool_size=512M
innodb_flush_log_at_trx_commit=0
EOF
```

## Configure Nodes 2 and 3

Copy the same configuration but change node-specific values:

```bash
# On node2, change these lines:
# wsrep_node_address="10.0.0.2"
# wsrep_node_name="galera-node2"

# On node3, change these lines:
# wsrep_node_address="10.0.0.3"
# wsrep_node_name="galera-node3"
```

## Open Firewall on All Nodes

```bash
sudo firewall-cmd --permanent --add-port=3306/tcp   # MySQL connections
sudo firewall-cmd --permanent --add-port=4567/tcp   # Galera replication
sudo firewall-cmd --permanent --add-port=4568/tcp   # Incremental State Transfer
sudo firewall-cmd --permanent --add-port=4444/tcp   # State Snapshot Transfer
sudo firewall-cmd --reload
```

## Bootstrap the Cluster

```bash
# On node1 ONLY, bootstrap the cluster
sudo galera_new_cluster

# Verify the cluster started
mysql -u root -e "SHOW STATUS LIKE 'wsrep_cluster_size';"
# wsrep_cluster_size = 1
```

## Join the Remaining Nodes

```bash
# On node2 and node3, start MariaDB normally
sudo systemctl start mariadb

# Verify cluster size from any node
mysql -u root -e "SHOW STATUS LIKE 'wsrep_cluster_size';"
# wsrep_cluster_size = 3
```

## Verify Replication

```bash
# Write data on node1
mysql -u root -e "CREATE DATABASE galera_test; USE galera_test; CREATE TABLE t1 (id INT PRIMARY KEY AUTO_INCREMENT, msg VARCHAR(100)); INSERT INTO t1 (msg) VALUES ('from node1');"

# Read from node2
mysql -u root -e "SELECT * FROM galera_test.t1;"

# Write from node3
mysql -u root -e "INSERT INTO galera_test.t1 (msg) VALUES ('from node3');"

# Verify on node1
mysql -u root -e "SELECT * FROM galera_test.t1;"
```

## Monitor Cluster Health

```bash
# Check key Galera status variables
mysql -u root -e "
SHOW STATUS LIKE 'wsrep_cluster_size';
SHOW STATUS LIKE 'wsrep_cluster_status';
SHOW STATUS LIKE 'wsrep_connected';
SHOW STATUS LIKE 'wsrep_ready';
SHOW STATUS LIKE 'wsrep_local_state_comment';
SHOW STATUS LIKE 'wsrep_flow_control_paused';
"
# Healthy output:
# wsrep_cluster_status = Primary
# wsrep_connected = ON
# wsrep_ready = ON
# wsrep_local_state_comment = Synced
```

Enable MariaDB on all nodes so they start automatically on boot:

```bash
sudo systemctl enable mariadb
```

A Galera Cluster requires a minimum of three nodes to avoid split-brain situations. Always use an odd number of nodes for proper quorum.

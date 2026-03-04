# How to Set Up a High-Availability MariaDB Galera Cluster on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MariaDB, Galera, High Availability, Cluster, Database, Linux

Description: Learn how to set up a high-availability MariaDB Galera cluster on RHEL 9 for synchronous multi-master database replication.

---

MariaDB Galera Cluster provides synchronous multi-master replication on RHEL 9. All nodes accept read and write operations, and data is replicated synchronously across the cluster. Combined with a virtual IP or load balancer, it provides high availability for database workloads.

## Prerequisites

- Three RHEL 9 servers (Galera requires at least 3 nodes for quorum)
- Network connectivity between all nodes
- Open firewall ports

## Step 1: Install MariaDB Galera

On all three nodes:

```bash
sudo dnf install mariadb-server mariadb-server-galera galera -y
```

## Step 2: Configure MariaDB

On each node, create the Galera configuration:

Node 1:

```bash
sudo tee /etc/my.cnf.d/galera.cnf << 'CONF'
[mysqld]
binlog_format=ROW
default-storage-engine=innodb
innodb_autoinc_lock_mode=2
bind-address=0.0.0.0

# Galera settings
wsrep_on=ON
wsrep_provider=/usr/lib64/galera/libgalera_smm.so
wsrep_cluster_name="my-galera-cluster"
wsrep_cluster_address="gcomm://192.168.1.11,192.168.1.12,192.168.1.13"
wsrep_node_address="192.168.1.11"
wsrep_node_name="node1"
wsrep_sst_method=rsync
CONF
```

Node 2 (change node address and name):

```bash
sudo tee /etc/my.cnf.d/galera.cnf << 'CONF'
[mysqld]
binlog_format=ROW
default-storage-engine=innodb
innodb_autoinc_lock_mode=2
bind-address=0.0.0.0

wsrep_on=ON
wsrep_provider=/usr/lib64/galera/libgalera_smm.so
wsrep_cluster_name="my-galera-cluster"
wsrep_cluster_address="gcomm://192.168.1.11,192.168.1.12,192.168.1.13"
wsrep_node_address="192.168.1.12"
wsrep_node_name="node2"
wsrep_sst_method=rsync
CONF
```

Node 3:

```bash
sudo tee /etc/my.cnf.d/galera.cnf << 'CONF'
[mysqld]
binlog_format=ROW
default-storage-engine=innodb
innodb_autoinc_lock_mode=2
bind-address=0.0.0.0

wsrep_on=ON
wsrep_provider=/usr/lib64/galera/libgalera_smm.so
wsrep_cluster_name="my-galera-cluster"
wsrep_cluster_address="gcomm://192.168.1.11,192.168.1.12,192.168.1.13"
wsrep_node_address="192.168.1.13"
wsrep_node_name="node3"
wsrep_sst_method=rsync
CONF
```

## Step 3: Configure Firewall

On all nodes:

```bash
sudo firewall-cmd --permanent --add-port=3306/tcp
sudo firewall-cmd --permanent --add-port=4567/tcp
sudo firewall-cmd --permanent --add-port=4568/tcp
sudo firewall-cmd --permanent --add-port=4444/tcp
sudo firewall-cmd --reload
```

## Step 4: Bootstrap the Cluster

On node1, bootstrap the cluster:

```bash
sudo galera_new_cluster
```

Verify the cluster is running:

```bash
mysql -u root -e "SHOW STATUS LIKE 'wsrep_cluster_size';"
```

Should show `1`.

## Step 5: Join Remaining Nodes

On node2:

```bash
sudo systemctl start mariadb
```

On node3:

```bash
sudo systemctl start mariadb
```

Verify cluster size:

```bash
mysql -u root -e "SHOW STATUS LIKE 'wsrep_cluster_size';"
```

Should show `3`.

## Step 6: Secure the Installation

On any node:

```bash
sudo mysql_secure_installation
```

## Step 7: Verify Replication

On node1, create a test database:

```bash
mysql -u root -p -e "CREATE DATABASE testdb; USE testdb; CREATE TABLE t1 (id INT PRIMARY KEY, name VARCHAR(50)); INSERT INTO t1 VALUES (1, 'test');"
```

On node2 and node3, verify the data exists:

```bash
mysql -u root -p -e "SELECT * FROM testdb.t1;"
```

## Step 8: Enable on Boot

On all nodes:

```bash
sudo systemctl enable mariadb
```

## Monitoring the Galera Cluster

Check cluster status:

```bash
mysql -u root -p -e "SHOW STATUS LIKE 'wsrep_%';" | grep -E "cluster_size|cluster_status|connected|ready|local_state"
```

Key metrics:

- `wsrep_cluster_size` - Number of nodes in the cluster
- `wsrep_cluster_status` - Should be "Primary"
- `wsrep_connected` - Should be "ON"
- `wsrep_ready` - Should be "ON"
- `wsrep_local_state_comment` - Should be "Synced"

## Adding a Load Balancer

For distributing connections across all nodes, use HAProxy:

```bash
sudo dnf install haproxy -y
```

Configure HAProxy:

```bash
sudo tee -a /etc/haproxy/haproxy.cfg << 'CONF'

listen galera-cluster
    bind *:3307
    mode tcp
    balance roundrobin
    option tcpka
    option mysql-check user haproxy
    server node1 192.168.1.11:3306 check weight 1
    server node2 192.168.1.12:3306 check weight 1
    server node3 192.168.1.13:3306 check weight 1
CONF
```

## Conclusion

MariaDB Galera Cluster on RHEL 9 provides synchronous multi-master replication with automatic node recovery. All nodes accept writes, ensuring no single point of failure. Use a load balancer to distribute database connections across all cluster members.

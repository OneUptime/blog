# How to Set Up MySQL Group Replication on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MySQL, Group Replication, High Availability, Clustering, Database

Description: Configure MySQL Group Replication on RHEL for a fault-tolerant, multi-node database cluster with automatic failover and conflict detection.

---

MySQL Group Replication is a built-in plugin that provides distributed, fault-tolerant database replication. It supports single-primary mode (one writer, multiple readers) and multi-primary mode (all nodes accept writes). This guide covers a three-node single-primary setup on RHEL.

## Prerequisites

You need three RHEL servers with MySQL 8.0 installed, each with a unique server ID and UUID.

## Configure All Nodes

Create the Group Replication configuration on each node:

```bash
# On node1 (192.168.1.50), create /etc/my.cnf.d/group_repl.cnf
sudo tee /etc/my.cnf.d/group_repl.cnf << 'EOF'
[mysqld]
# Server identification
server_id = 1
bind-address = 0.0.0.0

# Binary log settings (required for Group Replication)
log_bin = mysql-bin
binlog_format = ROW
binlog_checksum = NONE
gtid_mode = ON
enforce_gtid_consistency = ON
log_slave_updates = ON
master_info_repository = TABLE
relay_log_info_repository = TABLE

# Group Replication settings
plugin_load_add = 'group_replication.so'
group_replication_group_name = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
group_replication_start_on_boot = OFF
group_replication_local_address = "192.168.1.50:33061"
group_replication_group_seeds = "192.168.1.50:33061,192.168.1.51:33061,192.168.1.52:33061"

# Single-primary mode (default)
group_replication_single_primary_mode = ON

# Transaction write set extraction (required)
transaction_write_set_extraction = XXHASH64
EOF
```

On node2 and node3, use the same configuration but change:

```bash
# Node2 (192.168.1.51):
# server_id = 2
# group_replication_local_address = "192.168.1.51:33061"

# Node3 (192.168.1.52):
# server_id = 3
# group_replication_local_address = "192.168.1.52:33061"
```

## Restart MySQL on All Nodes

```bash
sudo systemctl restart mysqld
```

## Create the Replication User on All Nodes

```bash
# On each node, run:
mysql -u root -p << 'EOSQL'
SET SQL_LOG_BIN = 0;
CREATE USER 'repl_user'@'%' IDENTIFIED BY 'ReplPass!123';
GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'%';
GRANT CONNECTION_ADMIN ON *.* TO 'repl_user'@'%';
GRANT BACKUP_ADMIN ON *.* TO 'repl_user'@'%';
GRANT GROUP_REPLICATION_STREAM ON *.* TO 'repl_user'@'%';
FLUSH PRIVILEGES;
SET SQL_LOG_BIN = 1;

CHANGE REPLICATION SOURCE TO SOURCE_USER='repl_user', SOURCE_PASSWORD='ReplPass!123' FOR CHANNEL 'group_replication_recovery';
EOSQL
```

## Bootstrap the Group on Node1

```bash
# On node1 only, bootstrap the group
mysql -u root -p -e "
SET GLOBAL group_replication_bootstrap_group = ON;
START GROUP_REPLICATION;
SET GLOBAL group_replication_bootstrap_group = OFF;
"

# Verify the group started
mysql -u root -p -e "
SELECT * FROM performance_schema.replication_group_members;
"
```

## Join Node2 and Node3

```bash
# On node2 and node3, join the group (do NOT bootstrap)
mysql -u root -p -e "START GROUP_REPLICATION;"

# Verify all three members
mysql -u root -p -e "
SELECT MEMBER_HOST, MEMBER_PORT, MEMBER_STATE, MEMBER_ROLE
FROM performance_schema.replication_group_members;
"
# Expected: 3 rows, all ONLINE, one PRIMARY, two SECONDARY
```

## Open Firewall Ports

```bash
# On all nodes
sudo firewall-cmd --permanent --add-port=3306/tcp   # MySQL client connections
sudo firewall-cmd --permanent --add-port=33061/tcp   # Group Replication communication
sudo firewall-cmd --reload
```

## Test Replication

```bash
# On the primary node, create test data
mysql -u root -p -e "
CREATE DATABASE grtest;
USE grtest;
CREATE TABLE t1 (id INT PRIMARY KEY AUTO_INCREMENT, data VARCHAR(100));
INSERT INTO t1 (data) VALUES ('hello from primary');
"

# On a secondary node, verify data replicated
mysql -u root -p -e "SELECT * FROM grtest.t1;"
```

## Monitor Group Health

```bash
mysql -u root -p -e "
SELECT MEMBER_HOST, MEMBER_STATE, MEMBER_ROLE
FROM performance_schema.replication_group_members;

SELECT * FROM performance_schema.replication_group_member_stats\G
"
```

If the primary node fails, Group Replication automatically elects a new primary from the remaining secondaries. Applications should use MySQL Router or a similar proxy to handle connection failover transparently.

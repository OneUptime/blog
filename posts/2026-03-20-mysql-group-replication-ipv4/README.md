# How to Configure MySQL Group Replication on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Group Replication, IPv4, High Availability, Clustering, Database

Description: Set up MySQL Group Replication across IPv4 nodes for fault-tolerant multi-primary or single-primary clustering with automatic failover.

## Introduction

MySQL Group Replication provides a fault-tolerant cluster where data is replicated synchronously across multiple nodes. All nodes must communicate over IPv4 using the Group Replication local address. A minimum of 3 nodes is required to tolerate one failure.

## Architecture

```text
Node 1: 10.0.0.1:3306 (Group Replication port: 33061)
Node 2: 10.0.0.2:3306 (Group Replication port: 33061)
Node 3: 10.0.0.3:3306 (Group Replication port: 33061)
         ↕ Paxos-based consensus
    Single-primary mode: one node accepts writes, others are read-only
```

## Configuration (All Nodes)

```bash
# /etc/mysql/mysql.conf.d/mysqld.cnf

# Apply to EACH node, changing node-specific values

[mysqld]
# Unique server ID per node
server-id = 1                    # 2 on node2, 3 on node3

# Replication settings
gtid-mode = ON
enforce-gtid-consistency = ON
binlog-format = ROW
log-bin = mysql-bin
log-replica-updates = ON
binlog-checksum = NONE

# Group Replication plugin
plugin-load-add = group_replication.so
group-replication-start-on-boot = OFF  # Start manually first time

# Group unique identifier (same on all nodes)
group-replication-group-name = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"

# This node's group replication address (node-specific)
group-replication-local-address = "10.0.0.1:33061"    # Node 1

# All group members (same on all nodes)
group-replication-group-seeds = "10.0.0.1:33061,10.0.0.2:33061,10.0.0.3:33061"

# IP allow list (whitelist of group members)
group-replication-ip-allowlist = "10.0.0.1,10.0.0.2,10.0.0.3"

# Single primary mode (recommended)
group-replication-single-primary-mode = ON
group-replication-enforce-update-everywhere-checks = OFF

# Bind address
bind-address = 10.0.0.1          # Node-specific IP
```

## Initial Bootstrap (Node 1 Only)

```bash
# On Node 1 - bootstrap the group:
sudo mysql -u root -p

SET GLOBAL group_replication_bootstrap_group = ON;
START GROUP_REPLICATION;
SET GLOBAL group_replication_bootstrap_group = OFF;

-- Verify node 1 is primary
SELECT * FROM performance_schema.replication_group_members;
```

## Joining Nodes 2 and 3

```bash
# On Node 2 and Node 3 - join the existing group:
sudo mysql -u root -p

-- Create replication user (needed on each node)
CREATE USER 'repl'@'10.0.0.%' IDENTIFIED BY 'replpass';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'10.0.0.%';
FLUSH PRIVILEGES;

-- Configure replication user for group replication
CHANGE REPLICATION SOURCE TO
  SOURCE_USER='repl',
  SOURCE_PASSWORD='replpass'
  FOR CHANNEL 'group_replication_recovery';

-- Start group replication (no bootstrap)
START GROUP_REPLICATION;
```

## Verifying the Group

```bash
sudo mysql -e "SELECT * FROM performance_schema.replication_group_members;"
# Expected: 3 rows with ONLINE status

sudo mysql -e "SELECT MEMBER_HOST, MEMBER_STATE, MEMBER_ROLE FROM performance_schema.replication_group_members;"
# Shows which node is PRIMARY
```

## Conclusion

MySQL Group Replication requires all nodes to be connected via `group-replication-group-seeds` with explicit IPv4 addresses. Bootstrap the first node once, then join additional nodes without bootstrap. Use `performance_schema.replication_group_members` to verify all nodes show `ONLINE` status. Group Replication with single-primary mode provides automatic primary election on failure.

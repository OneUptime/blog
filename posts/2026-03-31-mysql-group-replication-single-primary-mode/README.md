# How to Set Up MySQL Group Replication in Single-Primary Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Group Replication, High Availability, Replication, InnoDB

Description: Learn how to configure MySQL Group Replication in single-primary mode for automatic failover and consistent write operations across a cluster.

---

## What Is Single-Primary Mode

MySQL Group Replication in single-primary mode designates one node as the primary (source) for all write operations. The remaining nodes are secondaries that receive replicated data and can serve reads. When the primary fails, the group automatically elects a new primary, providing high availability without manual intervention.

This mode is recommended for most production workloads because it avoids write conflicts that occur when multiple nodes accept concurrent writes.

## Prerequisites

- Three MySQL 8.0+ instances (for quorum)
- Unique `server_id` on each node
- Binary logging enabled
- GTID mode enabled
- All nodes reachable over the network

## Configure Each Node

Edit `/etc/mysql/mysql.conf.d/mysqld.cnf` (or `my.cnf`) on each server:

```ini
[mysqld]
# Node 1 example - adjust for each server
server_id = 1
gtid_mode = ON
enforce_gtid_consistency = ON
log_bin = mysql-bin
binlog_format = ROW
log_replica_updates = ON
plugin_load_add = group_replication.so

# Group Replication settings
group_replication_group_name = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
group_replication_start_on_boot = OFF
group_replication_local_address = "node1:33061"
group_replication_group_seeds = "node1:33061,node2:33061,node3:33061"
group_replication_bootstrap_group = OFF
group_replication_single_primary_mode = ON
group_replication_enforce_update_everywhere_checks = OFF
```

Replace `node1:33061` with the actual hostname or IP address. Each node must have a unique `server_id` and `group_replication_local_address`.

## Bootstrap the First Node

On node1, create the replication user and configure the recovery channel before bootstrapping:

```sql
-- Run on node1 first
SET SQL_LOG_BIN = 0;
CREATE USER 'repl'@'%' IDENTIFIED BY 'replPassword1!' REQUIRE SSL;
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';
FLUSH PRIVILEGES;
SET SQL_LOG_BIN = 1;

CHANGE REPLICATION SOURCE TO
  SOURCE_USER='repl',
  SOURCE_PASSWORD='replPassword1!'
  FOR CHANNEL 'group_replication_recovery';

SET GLOBAL group_replication_bootstrap_group = ON;
START GROUP_REPLICATION;
SET GLOBAL group_replication_bootstrap_group = OFF;
```

Verify node1 joined as the primary:

```sql
SELECT MEMBER_HOST, MEMBER_ROLE, MEMBER_STATE
FROM performance_schema.replication_group_members;
```

Expected output:

```text
+---------+-------------+--------------+
| node1   | PRIMARY     | ONLINE       |
+---------+-------------+--------------+
```

## Join Secondary Nodes

On node2 and node3, create the replication user and start group replication:

```sql
-- Run on each secondary
SET SQL_LOG_BIN = 0;
CREATE USER 'repl'@'%' IDENTIFIED BY 'replPassword1!' REQUIRE SSL;
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';
FLUSH PRIVILEGES;
SET SQL_LOG_BIN = 1;

CHANGE REPLICATION SOURCE TO
  SOURCE_USER='repl',
  SOURCE_PASSWORD='replPassword1!'
  FOR CHANNEL 'group_replication_recovery';

START GROUP_REPLICATION;
```

## Verify the Cluster

```sql
SELECT MEMBER_HOST, MEMBER_ROLE, MEMBER_STATE
FROM performance_schema.replication_group_members;
```

```text
+---------+-------------+--------------+
| node1   | PRIMARY     | ONLINE       |
| node2   | SECONDARY   | ONLINE       |
| node3   | SECONDARY   | ONLINE       |
+---------+-------------+--------------+
```

## Test Automatic Primary Election

Stop group replication on the current primary to trigger failover:

```sql
-- On node1
STOP GROUP_REPLICATION;
```

After a few seconds, query from node2 or node3:

```sql
SELECT MEMBER_HOST, MEMBER_ROLE, MEMBER_STATE
FROM performance_schema.replication_group_members;
```

One of the remaining nodes will have been elected as the new `PRIMARY`.

## Monitoring and Alerting

Use OneUptime to monitor your MySQL Group Replication cluster. Set up a custom monitor that queries `performance_schema.replication_group_members` and alerts when the number of `ONLINE` members drops below quorum (2 out of 3 nodes).

## Summary

Setting up MySQL Group Replication in single-primary mode involves configuring GTID, enabling the `group_replication` plugin, bootstrapping the first node, and joining secondaries with the recovery channel. The cluster automatically elects a new primary if the current one fails, providing high availability for write-intensive applications.

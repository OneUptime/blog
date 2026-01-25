# How to Configure MySQL Group Replication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: MySQL, Replication, High Availability, Clustering, Database

Description: Learn how to set up and configure MySQL Group Replication for high availability with automatic failover, conflict detection, and distributed consensus.

---

MySQL Group Replication provides a highly available, fault-tolerant database solution with automatic failover and built-in conflict detection. Unlike traditional master-slave replication, Group Replication uses a distributed consensus protocol to ensure data consistency across all members. This guide walks through setting up a production-ready Group Replication cluster.

## Group Replication Architecture

```mermaid
flowchart TB
    subgraph Group["MySQL Group Replication Cluster"]
        P[Primary Node<br/>Read/Write]
        S1[Secondary Node 1<br/>Read Only]
        S2[Secondary Node 2<br/>Read Only]

        P <-->|Paxos Consensus| S1
        P <-->|Paxos Consensus| S2
        S1 <-->|Paxos Consensus| S2
    end

    App[Application] -->|Writes| P
    App -->|Reads| P
    App -->|Reads| S1
    App -->|Reads| S2

    subgraph Features
        F1[Automatic Failover]
        F2[Conflict Detection]
        F3[Distributed Recovery]
    end
```

## Prerequisites

Before starting, ensure you have:

- MySQL 8.0 or later on all nodes
- Network connectivity between all nodes (ports 3306 and 33061)
- Unique server IDs for each node
- GTID-based replication enabled
- Binary logging enabled

## Node Configuration

### Node 1 (Primary) Configuration

Create `/etc/mysql/mysql.conf.d/group_replication.cnf`:

```ini
[mysqld]
# Server identification
server_id = 1
bind-address = 0.0.0.0

# Binary logging (required for Group Replication)
log_bin = mysql-bin
log_slave_updates = ON
binlog_format = ROW
binlog_checksum = NONE

# GTID configuration (required)
gtid_mode = ON
enforce_gtid_consistency = ON

# Replication settings
master_info_repository = TABLE
relay_log_info_repository = TABLE
transaction_write_set_extraction = XXHASH64

# Group Replication settings
plugin_load_add = 'group_replication.so'
group_replication_group_name = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
group_replication_start_on_boot = OFF
group_replication_local_address = "node1.example.com:33061"
group_replication_group_seeds = "node1.example.com:33061,node2.example.com:33061,node3.example.com:33061"
group_replication_bootstrap_group = OFF

# Single-primary mode (recommended for most cases)
group_replication_single_primary_mode = ON
group_replication_enforce_update_everywhere_checks = OFF

# Performance and safety settings
slave_parallel_workers = 4
slave_preserve_commit_order = ON
slave_parallel_type = LOGICAL_CLOCK
```

### Node 2 and Node 3 Configuration

Use the same configuration, changing only:

```ini
# Node 2
server_id = 2
group_replication_local_address = "node2.example.com:33061"

# Node 3
server_id = 3
group_replication_local_address = "node3.example.com:33061"
```

## Initial Setup

### Step 1: Create Replication User

Run on all nodes:

```sql
-- Create replication user
CREATE USER 'repl_user'@'%' IDENTIFIED BY 'SecureReplicationPassword123!';
GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'%';
GRANT CONNECTION_ADMIN ON *.* TO 'repl_user'@'%';
GRANT BACKUP_ADMIN ON *.* TO 'repl_user'@'%';
GRANT GROUP_REPLICATION_STREAM ON *.* TO 'repl_user'@'%';
FLUSH PRIVILEGES;

-- Configure the replication channel
CHANGE REPLICATION SOURCE TO
    SOURCE_USER='repl_user',
    SOURCE_PASSWORD='SecureReplicationPassword123!'
    FOR CHANNEL 'group_replication_recovery';
```

### Step 2: Bootstrap the First Node

On Node 1 only:

```sql
-- Bootstrap the group (only on the first node, only once)
SET GLOBAL group_replication_bootstrap_group = ON;
START GROUP_REPLICATION;
SET GLOBAL group_replication_bootstrap_group = OFF;

-- Verify the group is running
SELECT * FROM performance_schema.replication_group_members;
```

Expected output:

```
+---------------------------+--------------------------------------+-------------------+-------------+--------------+-------------+----------------+----------------------------+
| CHANNEL_NAME              | MEMBER_ID                            | MEMBER_HOST       | MEMBER_PORT | MEMBER_STATE | MEMBER_ROLE | MEMBER_VERSION | MEMBER_COMMUNICATION_STACK |
+---------------------------+--------------------------------------+-------------------+-------------+--------------+-------------+----------------+----------------------------+
| group_replication_applier | 12345678-1234-1234-1234-123456789abc | node1.example.com |        3306 | ONLINE       | PRIMARY     | 8.0.35         | XCom                       |
+---------------------------+--------------------------------------+-------------------+-------------+--------------+-------------+----------------+----------------------------+
```

### Step 3: Join Additional Nodes

On Node 2 and Node 3:

```sql
-- Join the existing group
START GROUP_REPLICATION;

-- Verify membership
SELECT * FROM performance_schema.replication_group_members;
```

## Monitoring Group Replication

### Check Cluster Status

```sql
-- View all group members and their status
SELECT
    MEMBER_HOST,
    MEMBER_PORT,
    MEMBER_STATE,
    MEMBER_ROLE
FROM performance_schema.replication_group_members;

-- Check if this node is the primary
SELECT
    MEMBER_HOST,
    MEMBER_ROLE,
    IF(@@server_uuid =
        (SELECT VARIABLE_VALUE
         FROM performance_schema.global_status
         WHERE VARIABLE_NAME = 'group_replication_primary_member'),
        'YES', 'NO') AS is_primary
FROM performance_schema.replication_group_members
WHERE MEMBER_ID = @@server_uuid;
```

### Monitor Replication Lag

```sql
-- Check transactions in queue
SELECT
    CHANNEL_NAME,
    COUNT_TRANSACTIONS_IN_QUEUE AS pending_transactions,
    COUNT_TRANSACTIONS_CHECKED AS checked_transactions,
    COUNT_CONFLICTS_DETECTED AS conflicts
FROM performance_schema.replication_group_member_stats
WHERE MEMBER_ID = @@server_uuid;

-- Check apply lag
SELECT
    CHANNEL_NAME,
    LAST_APPLIED_TRANSACTION,
    APPLYING_TRANSACTION_IMMEDIATE_COMMIT_TIMESTAMP,
    TIMESTAMPDIFF(SECOND,
        APPLYING_TRANSACTION_IMMEDIATE_COMMIT_TIMESTAMP,
        NOW()) AS lag_seconds
FROM performance_schema.replication_applier_status_by_worker
WHERE CHANNEL_NAME = 'group_replication_applier';
```

### Create Monitoring View

```sql
CREATE VIEW gr_status AS
SELECT
    m.MEMBER_HOST,
    m.MEMBER_PORT,
    m.MEMBER_STATE,
    m.MEMBER_ROLE,
    s.COUNT_TRANSACTIONS_IN_QUEUE AS queue_size,
    s.COUNT_CONFLICTS_DETECTED AS conflicts,
    s.TRANSACTIONS_COMMITTED_ALL_MEMBERS AS committed
FROM performance_schema.replication_group_members m
JOIN performance_schema.replication_group_member_stats s
    ON m.MEMBER_ID = s.MEMBER_ID;

-- Query the view
SELECT * FROM gr_status;
```

## Handling Failover

### Automatic Failover

Group Replication handles failover automatically. When the primary fails:

```mermaid
sequenceDiagram
    participant App as Application
    participant P as Primary
    participant S1 as Secondary 1
    participant S2 as Secondary 2

    Note over P: Primary fails
    P->>P: OFFLINE

    S1->>S2: Consensus: Elect new primary
    Note over S1: Elected as new Primary

    S1->>S1: MEMBER_ROLE = PRIMARY
    S2->>S2: MEMBER_ROLE = SECONDARY

    App->>S1: Redirect connections
    Note over App,S1: Service continues
```

### Manual Failover (Switch Primary)

```sql
-- On any node, change the primary to a specific member
SELECT group_replication_set_as_primary('member-uuid-here');

-- Or let MySQL choose the best candidate
SELECT group_replication_set_as_primary(
    (SELECT MEMBER_ID
     FROM performance_schema.replication_group_members
     WHERE MEMBER_ROLE = 'SECONDARY'
     LIMIT 1)
);
```

### Rejoining a Failed Node

```sql
-- Check why the node left the group
SELECT * FROM performance_schema.replication_group_members;
SHOW SLAVE STATUS FOR CHANNEL 'group_replication_applier'\G

-- Try to rejoin
START GROUP_REPLICATION;

-- If that fails, reset and rejoin
STOP GROUP_REPLICATION;
RESET SLAVE ALL FOR CHANNEL 'group_replication_recovery';
RESET SLAVE ALL FOR CHANNEL 'group_replication_applier';

-- Reconfigure and rejoin
CHANGE REPLICATION SOURCE TO
    SOURCE_USER='repl_user',
    SOURCE_PASSWORD='SecureReplicationPassword123!'
    FOR CHANNEL 'group_replication_recovery';

START GROUP_REPLICATION;
```

## Network Partition Handling

Configure how the group handles network partitions:

```sql
-- Set the threshold for unreachable members (default: 5 seconds)
SET GLOBAL group_replication_member_expel_timeout = 5;

-- Configure auto-rejoin attempts after expulsion
SET GLOBAL group_replication_autorejoin_tries = 3;

-- Configure behavior when a minority exists
SET GLOBAL group_replication_exit_state_action = 'READ_ONLY';
```

Options for `group_replication_exit_state_action`:

| Value | Behavior |
|-------|----------|
| READ_ONLY | Node becomes read-only (safest) |
| ABORT_SERVER | MySQL shuts down |
| OFFLINE_MODE | Node goes offline |

## Multi-Primary Mode

For workloads requiring writes to multiple nodes:

```ini
[mysqld]
# Enable multi-primary mode
group_replication_single_primary_mode = OFF
group_replication_enforce_update_everywhere_checks = ON
```

```sql
-- Switch existing cluster to multi-primary
SELECT group_replication_switch_to_multi_primary_mode();

-- Switch back to single-primary
SELECT group_replication_switch_to_single_primary_mode();
```

**Caution**: Multi-primary mode has limitations:
- No foreign key cascades across different tables
- No serializable isolation level
- Increased conflict probability

## SSL/TLS Configuration

Secure group communication with SSL:

```ini
[mysqld]
# Enable SSL for group replication
group_replication_ssl_mode = REQUIRED
group_replication_recovery_use_ssl = ON

# SSL certificate paths
ssl_ca = /etc/mysql/certs/ca.pem
ssl_cert = /etc/mysql/certs/server-cert.pem
ssl_key = /etc/mysql/certs/server-key.pem

# Group replication specific SSL
group_replication_recovery_ssl_ca = /etc/mysql/certs/ca.pem
group_replication_recovery_ssl_cert = /etc/mysql/certs/server-cert.pem
group_replication_recovery_ssl_key = /etc/mysql/certs/server-key.pem
```

## Application Connection Configuration

### Using MySQL Router

MySQL Router provides automatic failover for applications:

```bash
# Bootstrap MySQL Router with the cluster
mysqlrouter --bootstrap repl_user@node1.example.com:3306 \
    --user=mysqlrouter \
    --directory=/etc/mysqlrouter

# Start MySQL Router
systemctl start mysqlrouter
```

Application connection string:

```
# Read-write connections (port 6446)
mysql://app_user:password@localhost:6446/mydb

# Read-only connections (port 6447)
mysql://app_user:password@localhost:6447/mydb
```

### Connection Handling in Application Code

```python
import mysql.connector
from mysql.connector import pooling

# Configure connection pool with failover
config = {
    'pool_name': 'mypool',
    'pool_size': 10,
    'failover': [
        {'host': 'node1.example.com', 'port': 3306, 'priority': 100},
        {'host': 'node2.example.com', 'port': 3306, 'priority': 90},
        {'host': 'node3.example.com', 'port': 3306, 'priority': 80},
    ],
    'user': 'app_user',
    'password': 'password',
    'database': 'mydb',
    'connect_timeout': 5,
}

pool = pooling.MySQLConnectionPool(**config)

def execute_query(query, params=None):
    conn = pool.get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query, params)
        return cursor.fetchall()
    finally:
        conn.close()
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Member stuck in RECOVERING | Check network, increase recovery timeout |
| Conflicts detected | Review application logic, add proper locking |
| Cannot join group | Verify group_seeds, check firewall rules |
| Slow performance | Tune parallel workers, check network latency |

### Debug Commands

```sql
-- Check error log for GR issues
SELECT * FROM performance_schema.error_log
WHERE SUBSYSTEM = 'Repl'
ORDER BY LOGGED DESC LIMIT 20;

-- Check replication channel status
SELECT * FROM performance_schema.replication_connection_status\G
SELECT * FROM performance_schema.replication_applier_status\G
```

## Summary

MySQL Group Replication provides robust high availability with automatic failover and conflict detection. Key points for a successful deployment:

1. Use GTID-based replication with ROW format binary logging
2. Start with single-primary mode for most workloads
3. Configure proper network timeout and expel settings
4. Use MySQL Router for transparent application failover
5. Monitor queue size and conflicts regularly
6. Enable SSL for production deployments

With proper configuration and monitoring, Group Replication delivers a reliable foundation for mission-critical MySQL deployments.

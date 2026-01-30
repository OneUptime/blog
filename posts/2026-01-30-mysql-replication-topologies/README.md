# How to Build MySQL Replication Topologies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: MySQL, Database, Replication, High Availability

Description: Design MySQL replication topologies including master-slave, multi-source, and circular replication for read scaling and high availability.

---

MySQL replication is a core technology for scaling reads, achieving high availability, and distributing data across geographic regions. This guide walks through practical implementations of various replication topologies, from basic single-source setups to complex multi-source configurations.

## Understanding MySQL Replication Fundamentals

Replication in MySQL works by having the source (master) server write changes to a binary log, and replica (slave) servers read and apply those changes. There are two primary methods for tracking replication position.

### Binary Log File Position Replication

The traditional approach uses binary log file names and positions to track replication state. While straightforward, this method has limitations when promoting replicas or handling complex topologies.

### GTID-Based Replication

Global Transaction Identifiers (GTIDs) assign a unique identifier to each transaction, making it easier to track which transactions have been applied and simplifying failover procedures.

## Setting Up Your First Replication Topology

### Prerequisites

Before configuring replication, ensure you have:

| Requirement | Source Server | Replica Server |
|-------------|---------------|----------------|
| MySQL Version | 8.0+ recommended | Same or newer than source |
| Network Access | Port 3306 open | Can connect to source |
| Disk Space | Adequate for binary logs | Adequate for data + relay logs |
| User Privileges | REPLICATION SLAVE grant | N/A |

### Configuring the Source Server

Start by modifying the source server's configuration file to enable binary logging and set a unique server ID.

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf on the source server

[mysqld]
# Unique identifier for this server in the replication topology
server-id = 1

# Enable binary logging with a descriptive prefix
log_bin = /var/log/mysql/mysql-bin

# Recommended: use ROW format for most reliable replication
binlog_format = ROW

# Keep binary logs for 7 days (adjust based on your backup schedule)
binlog_expire_logs_seconds = 604800

# Sync binary log to disk on each commit for durability
sync_binlog = 1

# Enable GTIDs for easier topology management
gtid_mode = ON
enforce_gtid_consistency = ON
```

Restart MySQL to apply the changes.

```bash
# Restart the MySQL service
sudo systemctl restart mysql

# Verify binary logging is enabled
mysql -u root -p -e "SHOW VARIABLES LIKE 'log_bin';"
```

Create a dedicated replication user with appropriate privileges.

```sql
-- Create replication user on the source server
-- Use a strong password and restrict to specific IP if possible

CREATE USER 'repl_user'@'192.168.1.%' IDENTIFIED BY 'SecureRepl1cationPass!';

GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'192.168.1.%';

FLUSH PRIVILEGES;

-- Verify the user was created correctly
SELECT user, host FROM mysql.user WHERE user = 'repl_user';
```

### Configuring the Replica Server

Configure the replica server with its own unique server ID and replication settings.

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf on the replica server

[mysqld]
# Each server needs a unique ID
server-id = 2

# Enable relay log for receiving changes from source
relay_log = /var/log/mysql/mysql-relay-bin

# Read-only mode prevents accidental writes on replica
read_only = ON
super_read_only = ON

# Enable GTIDs to match source configuration
gtid_mode = ON
enforce_gtid_consistency = ON

# Store replication metadata in tables for crash safety
master_info_repository = TABLE
relay_log_info_repository = TABLE
```

### Taking an Initial Data Snapshot

For small databases, use mysqldump with the appropriate flags for replication.

```bash
# On the source server, create a consistent backup
# The --source-data flag records the binary log position

mysqldump -u root -p \
    --all-databases \
    --single-transaction \
    --routines \
    --triggers \
    --source-data=2 \
    > /tmp/full_backup.sql

# Transfer to replica
scp /tmp/full_backup.sql replica-server:/tmp/
```

For larger databases, use MySQL Enterprise Backup or Percona XtraBackup for hot backups.

```bash
# Using Percona XtraBackup for a hot backup
xtrabackup --backup \
    --user=root \
    --password=yourpassword \
    --target-dir=/backup/mysql/

# Prepare the backup
xtrabackup --prepare --target-dir=/backup/mysql/

# Copy to replica and restore
xtrabackup --copy-back --target-dir=/backup/mysql/
```

### Starting Replication with Binary Log Position

If using traditional binary log position replication, first identify the position from your backup.

```sql
-- On the replica, restore the backup first
-- Then configure the replication connection

-- Check the backup file for the binary log position
-- Look for: CHANGE MASTER TO MASTER_LOG_FILE='mysql-bin.000003', MASTER_LOG_POS=154;

CHANGE REPLICATION SOURCE TO
    SOURCE_HOST = '192.168.1.10',
    SOURCE_USER = 'repl_user',
    SOURCE_PASSWORD = 'SecureRepl1cationPass!',
    SOURCE_LOG_FILE = 'mysql-bin.000003',
    SOURCE_LOG_POS = 154;

-- Start the replication threads
START REPLICA;

-- Check replication status
SHOW REPLICA STATUS\G
```

### Starting Replication with GTIDs

GTID replication simplifies the initial setup since position tracking is automatic.

```sql
-- On the replica server with GTIDs enabled
-- MySQL automatically determines which transactions to fetch

CHANGE REPLICATION SOURCE TO
    SOURCE_HOST = '192.168.1.10',
    SOURCE_USER = 'repl_user',
    SOURCE_PASSWORD = 'SecureRepl1cationPass!',
    SOURCE_AUTO_POSITION = 1;

START REPLICA;

-- Verify GTID-based replication is working
SHOW REPLICA STATUS\G
```

## Single-Source Replication Topology

The most common topology involves one source with one or more replicas. This setup is straightforward and works well for read scaling.

```
                    +----------------+
                    |    Source      |
                    |  (Read/Write)  |
                    +-------+--------+
                            |
            +---------------+---------------+
            |               |               |
    +-------v-------+ +-----v-------+ +-----v-------+
    |   Replica 1   | |  Replica 2  | |  Replica 3  |
    |  (Read Only)  | | (Read Only) | | (Read Only) |
    +---------------+ +-------------+ +-------------+
```

### Scaling Reads with Multiple Replicas

Add additional replicas by repeating the replica configuration process. Use a load balancer or application-level routing to distribute read queries.

```sql
-- Example application connection logic (pseudocode)
-- Direct writes to source, reads to replicas

-- For write operations
INSERT INTO orders (customer_id, total) VALUES (123, 99.99);
-- Connect to: source.example.com

-- For read operations
SELECT * FROM orders WHERE customer_id = 123;
-- Connect to: replica1.example.com or replica2.example.com
```

### Configuring ProxySQL for Read/Write Splitting

ProxySQL can automatically route queries to appropriate servers.

```sql
-- Connect to ProxySQL admin interface
-- mysql -u admin -padmin -h 127.0.0.1 -P 6032

-- Add the source server (hostgroup 0 for writes)
INSERT INTO mysql_servers (hostgroup_id, hostname, port, weight)
VALUES (0, '192.168.1.10', 3306, 1);

-- Add replica servers (hostgroup 1 for reads)
INSERT INTO mysql_servers (hostgroup_id, hostname, port, weight)
VALUES (1, '192.168.1.11', 3306, 1);

INSERT INTO mysql_servers (hostgroup_id, hostname, port, weight)
VALUES (1, '192.168.1.12', 3306, 1);

-- Configure query routing rules
INSERT INTO mysql_query_rules (rule_id, active, match_pattern, destination_hostgroup)
VALUES (1, 1, '^SELECT.*FOR UPDATE', 0);

INSERT INTO mysql_query_rules (rule_id, active, match_pattern, destination_hostgroup)
VALUES (2, 1, '^SELECT', 1);

-- Apply the configuration
LOAD MYSQL SERVERS TO RUNTIME;
LOAD MYSQL QUERY RULES TO RUNTIME;
SAVE MYSQL SERVERS TO DISK;
SAVE MYSQL QUERY RULES TO DISK;
```

## Cascading Replication Topology

In cascading replication, some replicas serve as intermediate sources for other replicas. This reduces load on the primary source and is useful for geographically distributed setups.

```
                    +----------------+
                    |    Source      |
                    |  (Read/Write)  |
                    +-------+--------+
                            |
            +---------------+---------------+
            |                               |
    +-------v-------+               +-------v-------+
    |   Replica 1   |               |   Replica 2   |
    | (Intermediate)|               | (Intermediate)|
    +-------+-------+               +-------+-------+
            |                               |
    +-------v-------+               +-------v-------+
    |   Replica 1a  |               |   Replica 2a  |
    |  (Read Only)  |               |  (Read Only)  |
    +---------------+               +---------------+
```

### Configuring an Intermediate Replica

The intermediate replica must have binary logging enabled to act as a source for downstream replicas.

```ini
# Configuration for intermediate replica
# /etc/mysql/mysql.conf.d/mysqld.cnf

[mysqld]
server-id = 2

# Enable binary logging so this replica can be a source
log_bin = /var/log/mysql/mysql-bin
binlog_format = ROW

# Critical: log replica updates to binary log
log_replica_updates = ON

relay_log = /var/log/mysql/mysql-relay-bin
read_only = ON

gtid_mode = ON
enforce_gtid_consistency = ON
```

Configure the downstream replica to connect to the intermediate replica.

```sql
-- On the downstream replica (Replica 1a)
-- Point to the intermediate replica instead of the primary source

CHANGE REPLICATION SOURCE TO
    SOURCE_HOST = '192.168.1.11',  -- intermediate replica IP
    SOURCE_USER = 'repl_user',
    SOURCE_PASSWORD = 'SecureRepl1cationPass!',
    SOURCE_AUTO_POSITION = 1;

START REPLICA;
```

### Advantages and Considerations

| Aspect | Cascading | Direct to Source |
|--------|-----------|------------------|
| Source Load | Lower (fewer connections) | Higher (all replicas connect) |
| Replication Lag | Higher (additional hop) | Lower (direct connection) |
| Failover Complexity | More complex | Simpler |
| Geographic Distribution | Excellent fit | May require more bandwidth |

## Multi-Source Replication

Multi-source replication allows a single replica to receive data from multiple source servers. This is useful for aggregating data from different databases or creating a consolidated reporting server.

```
    +----------------+     +----------------+
    |   Source A     |     |   Source B     |
    | (sales_db)     |     | (inventory_db) |
    +-------+--------+     +-------+--------+
            |                      |
            +----------+-----------+
                       |
               +-------v-------+
               |    Replica    |
               | (consolidated)|
               +---------------+
```

### Configuring Multi-Source Replication

Each replication channel has a unique name and independent configuration.

```sql
-- On the multi-source replica
-- Configure the first channel for sales database

CHANGE REPLICATION SOURCE TO
    SOURCE_HOST = '192.168.1.10',
    SOURCE_USER = 'repl_user',
    SOURCE_PASSWORD = 'SecureRepl1cationPass!',
    SOURCE_AUTO_POSITION = 1
    FOR CHANNEL 'sales_channel';

-- Configure the second channel for inventory database
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST = '192.168.1.20',
    SOURCE_USER = 'repl_user',
    SOURCE_PASSWORD = 'SecureRepl1cationPass!',
    SOURCE_AUTO_POSITION = 1
    FOR CHANNEL 'inventory_channel';

-- Start both replication channels
START REPLICA FOR CHANNEL 'sales_channel';
START REPLICA FOR CHANNEL 'inventory_channel';

-- Check status of all channels
SHOW REPLICA STATUS FOR CHANNEL 'sales_channel'\G
SHOW REPLICA STATUS FOR CHANNEL 'inventory_channel'\G
```

### Handling Schema Conflicts

When replicating from multiple sources, ensure database and table names do not conflict.

```sql
-- Use replication filters to map databases to different names if needed
-- Configure in my.cnf or via CHANGE REPLICATION SOURCE

-- Example: replicate sales_db from source A
-- Configure on replica
CHANGE REPLICATION FILTER
    REPLICATE_DO_DB = (sales_db)
    FOR CHANNEL 'sales_channel';

-- Example: replicate inventory_db from source B
CHANGE REPLICATION FILTER
    REPLICATE_DO_DB = (inventory_db)
    FOR CHANNEL 'inventory_channel';
```

## Circular Replication

Circular replication creates a ring topology where each server is both a source and a replica. While this enables writes on any node, it introduces complexity and potential conflicts.

```
    +----------------+
    |   Server A     |<---------+
    +-------+--------+          |
            |                   |
            v                   |
    +-------+--------+          |
    |   Server B     |          |
    +-------+--------+          |
            |                   |
            v                   |
    +-------+--------+          |
    |   Server C     +-----------+
    +----------------+
```

### Configuring Circular Replication

Each server needs binary logging and must not apply its own transactions twice.

```ini
# Configuration for Server A (server-id = 1)
[mysqld]
server-id = 1
log_bin = /var/log/mysql/mysql-bin
binlog_format = ROW
log_replica_updates = ON
gtid_mode = ON
enforce_gtid_consistency = ON

# Auto-increment settings to prevent primary key conflicts
auto_increment_increment = 3
auto_increment_offset = 1
```

```ini
# Configuration for Server B (server-id = 2)
[mysqld]
server-id = 2
log_bin = /var/log/mysql/mysql-bin
binlog_format = ROW
log_replica_updates = ON
gtid_mode = ON
enforce_gtid_consistency = ON

auto_increment_increment = 3
auto_increment_offset = 2
```

```ini
# Configuration for Server C (server-id = 3)
[mysqld]
server-id = 3
log_bin = /var/log/mysql/mysql-bin
binlog_format = ROW
log_replica_updates = ON
gtid_mode = ON
enforce_gtid_consistency = ON

auto_increment_increment = 3
auto_increment_offset = 3
```

Set up the replication channels between servers.

```sql
-- On Server A: replicate from Server C
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST = 'server-c.example.com',
    SOURCE_USER = 'repl_user',
    SOURCE_PASSWORD = 'SecureRepl1cationPass!',
    SOURCE_AUTO_POSITION = 1;

START REPLICA;

-- On Server B: replicate from Server A
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST = 'server-a.example.com',
    SOURCE_USER = 'repl_user',
    SOURCE_PASSWORD = 'SecureRepl1cationPass!',
    SOURCE_AUTO_POSITION = 1;

START REPLICA;

-- On Server C: replicate from Server B
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST = 'server-b.example.com',
    SOURCE_USER = 'repl_user',
    SOURCE_PASSWORD = 'SecureRepl1cationPass!',
    SOURCE_AUTO_POSITION = 1;

START REPLICA;
```

### Conflict Resolution Strategies

Circular replication requires careful application design to avoid conflicts.

| Strategy | Description | Use Case |
|----------|-------------|----------|
| Partitioned Writes | Each server handles writes for specific data | Geographic sharding |
| Application Routing | Application ensures writes go to one primary | Active-passive with local reads |
| Conflict Detection | Monitor and resolve conflicts manually | Low-write workloads |

## Replication Filters

Replication filters allow you to selectively replicate databases, tables, or events.

### Database-Level Filters

```sql
-- Replicate only specific databases
CHANGE REPLICATION FILTER
    REPLICATE_DO_DB = (production_db, analytics_db);

-- Ignore specific databases
CHANGE REPLICATION FILTER
    REPLICATE_IGNORE_DB = (test_db, development_db);

-- Apply filters and restart replication
STOP REPLICA;
START REPLICA;
```

### Table-Level Filters

```sql
-- Replicate only specific tables
CHANGE REPLICATION FILTER
    REPLICATE_DO_TABLE = (production_db.orders, production_db.customers);

-- Ignore specific tables (useful for large log tables)
CHANGE REPLICATION FILTER
    REPLICATE_IGNORE_TABLE = (production_db.audit_log, production_db.session_data);

-- Use wildcards for pattern matching
CHANGE REPLICATION FILTER
    REPLICATE_WILD_DO_TABLE = ('production_db.%'),
    REPLICATE_WILD_IGNORE_TABLE = ('production_db.temp_%');
```

### Filter Configuration via my.cnf

```ini
# Static filter configuration in my.cnf
[mysqld]
# Replicate these databases
replicate-do-db = production_db
replicate-do-db = analytics_db

# Ignore these tables
replicate-ignore-table = production_db.debug_log
replicate-ignore-table = production_db.temp_data

# Wildcard patterns
replicate-wild-do-table = reporting_%.%
replicate-wild-ignore-table = %.cache_%
```

## Monitoring Replication Lag

Replication lag occurs when replicas fall behind the source. Monitoring and addressing lag is critical for applications that read from replicas.

### Basic Lag Monitoring

```sql
-- Check replication status on replica
SHOW REPLICA STATUS\G

-- Key fields to monitor:
-- Seconds_Behind_Source: estimated lag in seconds
-- Replica_IO_Running: should be 'Yes'
-- Replica_SQL_Running: should be 'Yes'
-- Last_Error: any replication errors
```

### Creating a Lag Monitoring Table

Implement a heartbeat table for more accurate lag measurement.

```sql
-- On the source server, create heartbeat table
CREATE DATABASE IF NOT EXISTS monitoring;

CREATE TABLE monitoring.replication_heartbeat (
    server_id INT PRIMARY KEY,
    heartbeat_time TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

-- Insert initial row
INSERT INTO monitoring.replication_heartbeat (server_id, heartbeat_time)
VALUES (1, NOW(6));
```

Create a scheduled event to update the heartbeat.

```sql
-- Enable event scheduler if not already enabled
SET GLOBAL event_scheduler = ON;

-- Create heartbeat update event
CREATE EVENT monitoring.update_heartbeat
ON SCHEDULE EVERY 1 SECOND
DO
    UPDATE monitoring.replication_heartbeat
    SET heartbeat_time = NOW(6)
    WHERE server_id = 1;
```

Query lag from the replica.

```sql
-- On the replica, measure actual lag
SELECT
    server_id,
    heartbeat_time AS source_time,
    NOW(6) AS replica_time,
    TIMESTAMPDIFF(MICROSECOND, heartbeat_time, NOW(6)) / 1000000 AS lag_seconds
FROM monitoring.replication_heartbeat;
```

### Monitoring Script

```bash
#!/bin/bash
# replication_monitor.sh - Monitor MySQL replication lag

MYSQL_USER="monitor"
MYSQL_PASS="monitorpassword"
REPLICA_HOST="replica.example.com"
ALERT_THRESHOLD=30  # seconds

while true; do
    # Get Seconds_Behind_Source
    LAG=$(mysql -u$MYSQL_USER -p$MYSQL_PASS -h$REPLICA_HOST -N -e \
        "SHOW REPLICA STATUS\G" | grep "Seconds_Behind_Source" | awk '{print $2}')

    IO_RUNNING=$(mysql -u$MYSQL_USER -p$MYSQL_PASS -h$REPLICA_HOST -N -e \
        "SHOW REPLICA STATUS\G" | grep "Replica_IO_Running" | awk '{print $2}')

    SQL_RUNNING=$(mysql -u$MYSQL_USER -p$MYSQL_PASS -h$REPLICA_HOST -N -e \
        "SHOW REPLICA STATUS\G" | grep "Replica_SQL_Running" | awk '{print $2}')

    echo "$(date): Lag=${LAG}s, IO=${IO_RUNNING}, SQL=${SQL_RUNNING}"

    # Check for issues
    if [ "$IO_RUNNING" != "Yes" ] || [ "$SQL_RUNNING" != "Yes" ]; then
        echo "ALERT: Replication threads not running!"
        # Add alerting logic here (email, Slack, PagerDuty, etc.)
    fi

    if [ "$LAG" != "NULL" ] && [ "$LAG" -gt "$ALERT_THRESHOLD" ]; then
        echo "ALERT: Replication lag exceeds threshold: ${LAG}s"
        # Add alerting logic here
    fi

    sleep 10
done
```

### Performance Schema Replication Tables

MySQL 8.0 provides detailed replication information through Performance Schema.

```sql
-- View replication connection status
SELECT * FROM performance_schema.replication_connection_status\G

-- View replication applier status
SELECT * FROM performance_schema.replication_applier_status\G

-- View individual worker thread status (for parallel replication)
SELECT * FROM performance_schema.replication_applier_status_by_worker;

-- Comprehensive replication lag query
SELECT
    CHANNEL_NAME,
    SERVICE_STATE,
    LAST_ERROR_NUMBER,
    LAST_ERROR_MESSAGE,
    LAST_ERROR_TIMESTAMP
FROM performance_schema.replication_applier_status_by_coordinator;
```

## Optimizing Replication Performance

### Parallel Replication

Enable parallel replication to apply transactions concurrently on replicas.

```ini
# my.cnf configuration for parallel replication
[mysqld]
# Number of parallel worker threads
replica_parallel_workers = 8

# Use logical clock for better parallelization
replica_parallel_type = LOGICAL_CLOCK

# Preserve commit order (recommended for consistency)
replica_preserve_commit_order = ON
```

### Binary Log Compression

Reduce network bandwidth and storage with binary log compression (MySQL 8.0.20+).

```ini
# Enable binary log compression
[mysqld]
binlog_transaction_compression = ON
binlog_transaction_compression_level_zstd = 3
```

### Network Optimization

```ini
# Increase network buffer sizes for high-throughput replication
[mysqld]
# On source
max_allowed_packet = 1073741824

# On replica
replica_net_timeout = 60
replica_compressed_protocol = ON
```

## Handling Replication Failures

### Common Error Recovery

```sql
-- Skip a single transaction causing errors (use with caution)
-- First, identify the problematic GTID
SHOW REPLICA STATUS\G

-- Set the GTID as already executed
SET GTID_NEXT = 'source-uuid:transaction-id';
BEGIN; COMMIT;
SET GTID_NEXT = 'AUTOMATIC';

-- Resume replication
START REPLICA;
```

### Resyncing a Replica

When a replica is too far behind or corrupted, resync from scratch.

```bash
# Stop the replica
mysql -e "STOP REPLICA;"

# Take a fresh backup from source
mysqldump -h source.example.com -u backup_user -p \
    --all-databases \
    --single-transaction \
    --source-data=2 \
    --routines \
    --triggers \
    > fresh_backup.sql

# Reset the replica
mysql -e "RESET REPLICA ALL;"

# Restore the backup
mysql < fresh_backup.sql

# Reconfigure and start replication
mysql -e "
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST = 'source.example.com',
    SOURCE_USER = 'repl_user',
    SOURCE_PASSWORD = 'SecureRepl1cationPass!',
    SOURCE_AUTO_POSITION = 1;
START REPLICA;
"
```

## Security Considerations

### Encrypting Replication Traffic

```sql
-- Require SSL for replication connections
-- On the source, modify the replication user

ALTER USER 'repl_user'@'192.168.1.%' REQUIRE SSL;

-- On the replica, configure SSL parameters
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST = '192.168.1.10',
    SOURCE_USER = 'repl_user',
    SOURCE_PASSWORD = 'SecureRepl1cationPass!',
    SOURCE_AUTO_POSITION = 1,
    SOURCE_SSL = 1,
    SOURCE_SSL_CA = '/etc/mysql/certs/ca.pem',
    SOURCE_SSL_CERT = '/etc/mysql/certs/client-cert.pem',
    SOURCE_SSL_KEY = '/etc/mysql/certs/client-key.pem';
```

### Limiting Replication User Privileges

```sql
-- Create a minimal replication user
CREATE USER 'repl_user'@'192.168.1.%'
    IDENTIFIED BY 'SecureRepl1cationPass!'
    REQUIRE SSL;

-- Grant only necessary privileges
GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'192.168.1.%';

-- For GTID replication with certain topologies
GRANT REPLICATION CLIENT ON *.* TO 'repl_user'@'192.168.1.%';
```

## Summary

Building MySQL replication topologies requires understanding your application's read/write patterns, consistency requirements, and geographic distribution needs. Key takeaways:

| Topology | Best For | Complexity |
|----------|----------|------------|
| Single-Source | Read scaling, simple HA | Low |
| Cascading | Geographic distribution, reducing source load | Medium |
| Multi-Source | Data aggregation, consolidated reporting | Medium |
| Circular | Multi-region writes (with careful design) | High |

Start with the simplest topology that meets your needs and evolve as requirements change. Always monitor replication lag, test failover procedures, and maintain proper backups regardless of your replication setup.

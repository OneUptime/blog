# How to Use Replication Channels in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Channel, Multi-Source, Configuration

Description: Learn how to use MySQL replication channels to manage multiple replication streams, including multi-source replication and channel-specific operations.

---

Replication channels, introduced in MySQL 5.7, allow a single replica to receive data from multiple source servers simultaneously (multi-source replication) or to manage multiple named replication streams independently. Each channel has its own relay logs, applier threads, and status, making them independently manageable.

## What Are Replication Channels

By default, MySQL uses a single unnamed channel (the empty string `''`). With channels, you can:
- Replicate from multiple source servers into one replica
- Manage each source's replication independently
- Apply different filters per channel
- Monitor and control channels separately

## Listing Active Channels

```sql
SELECT channel_name, service_state, last_error_message
FROM performance_schema.replication_connection_status;
```

Or via the traditional command:

```sql
SHOW REPLICA STATUS FOR CHANNEL 'channel1'\G
```

## Setting Up Multi-Source Replication

Configure the replica to receive from two source servers:

**Prerequisites on the replica:**

```ini
[mysqld]
server_id = 10
log_bin = /var/lib/mysql/binlogs/mysql-bin
relay_log = /var/lib/mysql/relaylogs/relay-bin
gtid_mode = ON
enforce_gtid_consistency = ON
```

**Create replication users on each source:**

```sql
-- On source1
CREATE USER 'repl_user'@'replica.example.com' IDENTIFIED BY 'ReplPass1';
GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'replica.example.com';

-- On source2
CREATE USER 'repl_user'@'replica.example.com' IDENTIFIED BY 'ReplPass2';
GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'replica.example.com';
```

**Configure channels on the replica:**

```sql
-- Configure channel for source1
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '192.168.1.10',
  SOURCE_PORT = 3306,
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'ReplPass1',
  SOURCE_AUTO_POSITION = 1
FOR CHANNEL 'source1';

-- Configure channel for source2
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '192.168.1.20',
  SOURCE_PORT = 3306,
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'ReplPass2',
  SOURCE_AUTO_POSITION = 1
FOR CHANNEL 'source2';
```

## Starting and Stopping Individual Channels

```sql
-- Start all channels
START REPLICA;

-- Start a specific channel
START REPLICA FOR CHANNEL 'source1';

-- Stop a specific channel
STOP REPLICA FOR CHANNEL 'source2';

-- Stop the IO thread of a specific channel
STOP REPLICA IO_THREAD FOR CHANNEL 'source1';
```

## Checking Channel Status

```sql
-- Check all channels
SHOW REPLICA STATUS FOR CHANNEL 'source1'\G
SHOW REPLICA STATUS FOR CHANNEL 'source2'\G

-- Performance schema view for all channels
SELECT channel_name, service_state, last_error_message, last_heartbeat_timestamp
FROM performance_schema.replication_connection_status;

SELECT channel_name, service_state, last_processed_transaction
FROM performance_schema.replication_applier_status_by_coordinator;
```

## Applying Filters per Channel

Set different replication filters for each channel:

```sql
-- Only replicate orders database from source1
CHANGE REPLICATION FILTER
  REPLICATE_WILD_DO_TABLE = ('orders_db.%')
FOR CHANNEL 'source1';

-- Only replicate audit database from source2
CHANGE REPLICATION FILTER
  REPLICATE_WILD_DO_TABLE = ('audit_db.%')
FOR CHANNEL 'source2';
```

## Removing a Channel

```sql
STOP REPLICA FOR CHANNEL 'source2';
RESET REPLICA ALL FOR CHANNEL 'source2';
```

## Default Channel Operations

Operations without a `FOR CHANNEL` clause apply to all channels:

```sql
-- Applies to all channels
START REPLICA;
STOP REPLICA;

-- Show status of all channels
SHOW REPLICA STATUS\G
```

## Monitoring Multi-Source Lag

```sql
SELECT channel_name,
       TIMESTAMPDIFF(SECOND,
         last_applied_transaction_end_apply_timestamp,
         NOW()) AS seconds_behind
FROM performance_schema.replication_applier_status_by_worker
WHERE last_applied_transaction != '';
```

## Summary

Replication channels enable flexible multi-source replication where one replica consolidates data from multiple sources. Configure each channel with `CHANGE REPLICATION SOURCE TO ... FOR CHANNEL 'name'`, then start and monitor them independently. Apply per-channel filters with `CHANGE REPLICATION FILTER ... FOR CHANNEL` to control which databases each source replicates. Monitor all channels through `performance_schema.replication_connection_status` for a consolidated view of replication health across all sources.

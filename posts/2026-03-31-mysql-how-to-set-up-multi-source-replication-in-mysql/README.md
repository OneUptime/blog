# How to Set Up Multi-Source Replication in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Multi-Source Replication, Database Administration

Description: Learn how to configure MySQL multi-source replication to consolidate data from multiple primary servers into a single replica.

---

## What Is Multi-Source Replication

MySQL multi-source replication allows a single replica to receive and apply transactions from multiple primary servers simultaneously. This is useful for data consolidation, reporting, or aggregating data from distributed deployments into one server.

Each replication source is tracked using a named channel, so events from different primaries remain isolated and manageable.

## Prerequisites

- MySQL 8.0.23 or later on all servers (the `CHANGE REPLICATION SOURCE TO` syntax requires 8.0.23+)
- Unique `server_id` values on every server

## Step 1 - Configure the Replica for Multi-Source Mode

On the replica, ensure a unique `server_id` is set:

```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
server_id = 100
```

In MySQL 8.0+, the master info and relay log repositories already default to `TABLE`, which is required for multi-source replication. No additional repository configuration is needed.

Restart MySQL after editing:

```bash
sudo systemctl restart mysql
```

## Step 2 - Create a Replication User on Each Primary

Run this on **Primary 1** and **Primary 2** (use different passwords):

```sql
CREATE USER 'repl'@'replica_ip' IDENTIFIED BY 'strongpassword';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'replica_ip';
FLUSH PRIVILEGES;
```

## Step 3 - Record Binary Log Coordinates on Each Primary

On each primary, note the current log file and position:

```sql
SHOW MASTER STATUS\G
```

```text
*************************** 1. row ***************************
             File: mysql-bin.000003
         Position: 154
     Binlog_Do_DB:
 Binlog_Ignore_DB:
```

## Step 4 - Add Each Primary as a Source on the Replica

Use `FOR CHANNEL` to distinguish each source:

```sql
-- Connect to Primary 1
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST    = '192.168.1.10',
  SOURCE_USER    = 'repl',
  SOURCE_PASSWORD = 'strongpassword',
  SOURCE_LOG_FILE = 'mysql-bin.000003',
  SOURCE_LOG_POS  = 154
FOR CHANNEL 'primary1';

-- Connect to Primary 2
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST    = '192.168.1.11',
  SOURCE_USER    = 'repl',
  SOURCE_PASSWORD = 'strongpassword',
  SOURCE_LOG_FILE = 'mysql-bin.000005',
  SOURCE_LOG_POS  = 120
FOR CHANNEL 'primary2';
```

## Step 5 - Start Replication on All Channels

```sql
-- Start all channels
START REPLICA;

-- Or start a specific channel
START REPLICA FOR CHANNEL 'primary1';
START REPLICA FOR CHANNEL 'primary2';
```

## Step 6 - Verify Replication Status

Check the status of each channel individually:

```sql
SHOW REPLICA STATUS FOR CHANNEL 'primary1'\G
SHOW REPLICA STATUS FOR CHANNEL 'primary2'\G
```

Look for `Replica_IO_Running: Yes` and `Replica_SQL_Running: Yes` in each output.

To see all channels at once:

```sql
SELECT CHANNEL_NAME, SERVICE_STATE
FROM performance_schema.replication_connection_status;
```

## Handling Conflicts with Multi-Source

When the same table is written to by multiple primaries, conflicts can arise. Use `GTID`-based replication to help detect duplicate transactions:

```ini
[mysqld]
gtid_mode            = ON
enforce_gtid_consistency = ON
```

With GTIDs, configure each channel:

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST    = '192.168.1.10',
  SOURCE_USER    = 'repl',
  SOURCE_PASSWORD = 'strongpassword',
  SOURCE_AUTO_POSITION = 1
FOR CHANNEL 'primary1';
```

## Stopping and Resetting a Channel

```sql
-- Stop a single channel
STOP REPLICA FOR CHANNEL 'primary1';

-- Remove a channel entirely
RESET REPLICA ALL FOR CHANNEL 'primary1';
```

## Summary

MySQL multi-source replication lets one replica pull data from several primaries using named channels. You configure each channel with `CHANGE REPLICATION SOURCE TO ... FOR CHANNEL`, then start and monitor them independently. Using GTID mode is recommended to simplify conflict detection and channel management.

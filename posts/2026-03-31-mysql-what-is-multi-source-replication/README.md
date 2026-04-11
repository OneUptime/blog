# What Is Multi-Source Replication in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Multi-Source, Consolidation, High Availability

Description: Multi-source replication in MySQL allows a single replica to receive and apply transactions from multiple source servers simultaneously.

---

## Overview

Multi-source replication enables a MySQL replica to replicate from more than one source server at the same time. Each source is tracked as a separate replication channel, with its own I/O thread, SQL thread, relay log files, and position tracking. This feature was introduced in MySQL 5.7 and is commonly used for consolidating data from multiple shards or regional databases into a single reporting or backup server.

## Common Use Cases

- **Data consolidation**: Aggregate writes from multiple application databases into one reporting replica.
- **Backup**: A single server backs up several production sources.
- **Monitoring**: Collect data from many sources for centralized auditing or analytics.

## Configuring Multi-Source Replication

Each source is added as a named channel:

```sql
-- Add first source as channel 'source_1'
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '10.0.0.1',
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'secret',
  SOURCE_AUTO_POSITION = 1
FOR CHANNEL 'source_1';

-- Add second source as channel 'source_2'
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '10.0.0.2',
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'secret',
  SOURCE_AUTO_POSITION = 1
FOR CHANNEL 'source_2';

-- Start all channels
START REPLICA;

-- Or start a specific channel
START REPLICA FOR CHANNEL 'source_1';
```

## Monitoring Multiple Channels

```sql
-- View status of all channels
SHOW REPLICA STATUS\G

-- Filter by channel name
SELECT
  CHANNEL_NAME,
  SERVICE_STATE,
  LAST_ERROR_MESSAGE
FROM performance_schema.replication_applier_status_by_coordinator
ORDER BY CHANNEL_NAME;
```

## Handling Table Conflicts

When multiple sources write to the same tables, conflicts can arise. You must design your schema to avoid collisions:

- **UUID primary keys**: Use `UUID()` or application-generated UUIDs instead of auto-increment integers, which will collide across sources.
- **Separate schemas per source**: Each source writes to its own database on the replica, avoiding overlapping tables.

```sql
-- Using auto_increment_increment and auto_increment_offset to stagger values
-- Source 1: server_id=1, auto_increment_increment=2, auto_increment_offset=1 -> 1, 3, 5...
-- Source 2: server_id=2, auto_increment_increment=2, auto_increment_offset=2 -> 2, 4, 6...
SET GLOBAL auto_increment_increment = 2;
SET GLOBAL auto_increment_offset = 1;
```

## Stopping and Removing Channels

```sql
-- Stop a specific channel
STOP REPLICA FOR CHANNEL 'source_2';

-- Remove a channel entirely
RESET REPLICA ALL FOR CHANNEL 'source_2';
```

## Limitations

- Multi-source replication works best when each source writes to separate databases on the replica.
- Mixing GTID and non-GTID channels is not supported.
- Global replication filters apply to all channels unless per-channel filters are configured.

```sql
-- Per-channel filter (MySQL 8.0+)
CHANGE REPLICATION FILTER
  REPLICATE_DO_DB = (mydb)
FOR CHANNEL 'source_1';
```

## Summary

Multi-source replication allows a single MySQL replica to consume changes from multiple sources by using named channels, each with independent thread management and position tracking. It is ideal for data consolidation and centralized backup scenarios. Careful schema design is required to avoid primary key conflicts when multiple sources write to the same table structures.

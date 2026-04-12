# How to Use the MySQL Clone Plugin for Rapid Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Clone, Replication, Plugin, Provisioning

Description: Learn how to use the MySQL Clone Plugin to rapidly provision new replicas and clone databases locally or remotely in MySQL 8.0.

---

The MySQL Clone Plugin, introduced in MySQL 8.0.17, provides a fast and reliable way to clone an entire MySQL instance - either locally or from a remote server. It is particularly useful for provisioning new replicas quickly without the overhead of a full logical dump and restore.

## Installing the Clone Plugin

The Clone Plugin must be installed on both the donor (source) and recipient (destination) servers:

```sql
INSTALL PLUGIN clone SONAME 'mysql_clone.so';
```

Verify installation:

```sql
SELECT plugin_name, plugin_status
FROM information_schema.plugins
WHERE plugin_name = 'clone';
```

You can also load it automatically at startup by adding to `my.cnf`:

```ini
[mysqld]
plugin-load-add=mysql_clone.so
```

## Creating Required Users

The clone operation requires a dedicated user with the `BACKUP_ADMIN` privilege on the donor, and `CLONE_ADMIN` on the recipient:

```sql
-- On the donor server
CREATE USER 'clone_donor'@'%' IDENTIFIED BY 'StrongPassword123';
GRANT BACKUP_ADMIN ON *.* TO 'clone_donor'@'%';

-- On the recipient server
CREATE USER 'clone_local'@'localhost' IDENTIFIED BY 'LocalPassword123';
GRANT CLONE_ADMIN ON *.* TO 'clone_local'@'localhost';
```

## Performing a Local Clone

A local clone copies data within the same server to a different directory:

```sql
CLONE LOCAL DATA DIRECTORY = '/var/lib/mysql-clone';
```

This is useful for creating a snapshot for testing or backup purposes without touching the network.

## Performing a Remote Clone

To clone from a remote donor to provision a new replica:

```sql
-- Run on the recipient server
SET GLOBAL clone_valid_donor_list = '192.168.1.10:3306';

CLONE INSTANCE FROM 'clone_donor'@'192.168.1.10':3306
  IDENTIFIED BY 'StrongPassword123';
```

The recipient server will restart automatically after the clone completes, which is normal behavior.

## Monitoring Clone Progress

Track clone progress in real time using the Performance Schema:

```sql
SELECT STATE, BEGIN_TIME, END_TIME,
       ROUND(BINLOG_POSITION) AS binlog_pos,
       ERROR_NO, ERROR_MESSAGE
FROM performance_schema.clone_status;
```

For file-level progress:

```sql
SELECT STAGE, STATE, ESTIMATE, DATA, NETWORK
FROM performance_schema.clone_progress;
```

## Setting Up Replication After Clone

After a remote clone, the recipient has the binary log position stored. Configure replication:

```sql
-- On the recipient, after clone restarts the server
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST='192.168.1.10',
  SOURCE_PORT=3306,
  SOURCE_USER='repl_user',
  SOURCE_PASSWORD='ReplPassword',
  SOURCE_AUTO_POSITION=1;

START REPLICA;
SHOW REPLICA STATUS\G
```

If using GTID replication, `SOURCE_AUTO_POSITION=1` handles positioning automatically based on the GTIDs included in the clone.

## Configuring Clone Parameters

Key configuration variables for tuning clone performance:

```sql
-- Set maximum clone throughput (MiB/sec), 0 = unlimited
SET GLOBAL clone_max_data_bandwidth = 100; -- 100 MiB/s

-- Set local clone buffer size
SET GLOBAL clone_buffer_size = 4194304; -- 4 MiB
```

```ini
[mysqld]
clone_max_data_bandwidth = 100
clone_autotune_concurrency = ON
clone_max_concurrency = 16
```

## Summary

The MySQL Clone Plugin dramatically reduces the time to provision new replicas compared to logical dump-and-restore workflows. Install the plugin on donor and recipient, create users with the appropriate privileges, and use `CLONE INSTANCE FROM` on the recipient. Monitor progress via `performance_schema.clone_status` and follow up by configuring replication with GTID auto-positioning for a fully automated provisioning pipeline.

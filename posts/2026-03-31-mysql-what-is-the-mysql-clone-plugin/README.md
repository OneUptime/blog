# What Is the MySQL Clone Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Clone Plugin, Replication, Backup

Description: The MySQL Clone Plugin enables fast provisioning of new replicas by copying a complete and consistent snapshot of a running MySQL instance over the network.

---

## Overview

The MySQL Clone Plugin, introduced in MySQL 8.0.17, allows you to clone a complete, consistent copy of a MySQL instance - either locally to another directory or remotely to another MySQL server. It is the fastest way to provision a new replica without taking the primary offline.

The plugin copies all InnoDB data, including all databases, tablespaces, redo logs, and undo logs, then leaves the cloned server ready to join a replication group.

## Installing the Clone Plugin

```sql
-- Load the plugin
INSTALL PLUGIN clone SONAME 'mysql_clone.so';

-- Verify it's installed
SELECT plugin_name, plugin_status FROM information_schema.plugins
WHERE plugin_name = 'clone';
```

Or load it permanently via config:

```text
[mysqld]
plugin-load-add = mysql_clone.so
```

## Cloning Locally

```sql
-- Clone the current instance to a local directory
CLONE LOCAL DATA DIRECTORY = '/var/lib/mysql_clone/';
```

The destination directory must not exist yet - MySQL creates it.

## Cloning Remotely (Provisioning a New Replica)

### Step 1: Set Up the Donor

On the source server, grant the clone privilege:

```sql
CREATE USER 'clone_user'@'%' IDENTIFIED BY 'clone_password';
GRANT BACKUP_ADMIN ON *.* TO 'clone_user'@'%';
GRANT CLONE_ADMIN ON *.* TO 'clone_user'@'%';
```

### Step 2: Configure the Recipient

On the new server, set the donor:

```sql
-- Install plugin on recipient too
INSTALL PLUGIN clone SONAME 'mysql_clone.so';

-- Run the clone
CLONE INSTANCE FROM 'clone_user'@'source_host':3306
IDENTIFIED BY 'clone_password';
```

The recipient server will restart automatically after cloning completes.

## Monitoring Clone Progress

```sql
-- Monitor clone operation status
SELECT
  STATE,
  BEGIN_TIME,
  END_TIME,
  SOURCE,
  DESTINATION,
  ERROR_NO,
  ERROR_MESSAGE,
  BINLOG_FILE,
  BINLOG_POSITION
FROM performance_schema.clone_status;

-- Detailed per-stage progress
SELECT * FROM performance_schema.clone_progress;
```

## After Cloning - Setting Up Replication

After the clone completes, the new server has the binary log coordinates ready:

```sql
-- On the recipient, get the binlog position from clone status
SELECT BINLOG_FILE, BINLOG_POSITION
FROM performance_schema.clone_status;

-- Set up replication
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = 'source_host',
  SOURCE_USER = 'replication_user',
  SOURCE_PASSWORD = 'replication_password',
  SOURCE_LOG_FILE = 'mysql-bin.000042',
  SOURCE_LOG_POS = 12345;

START REPLICA;
```

## Using Clone with Group Replication

The Clone Plugin integrates with Group Replication for automatic provisioning:

```sql
-- Enable automatic cloning for new group members
SET PERSIST group_replication_clone_threshold = 1;
```

When a new member joins the group and is too far behind to catch up via binary log, it automatically clones from an existing member.

## Clone Plugin Limitations

- Source and target must run the same MySQL version
- Only InnoDB tables are cloned (MyISAM tables are not cloned)
- Active DDL on source may slow the clone
- Recipient data directory is completely overwritten

## Cleanup After Clone

```sql
-- Remove the clone plugin if no longer needed
UNINSTALL PLUGIN clone;
```

## Summary

The MySQL Clone Plugin provides a fast, online method to provision new replicas by copying a consistent snapshot of a running instance. It eliminates the need to take the primary offline or manually use `mysqldump`, and integrates natively with Group Replication for automatic member provisioning. It is the recommended approach for adding new replicas to MySQL 8.0 setups.

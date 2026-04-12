# How to Use the CLONE Plugin in MySQL 8

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Clone Plugin, Replication, Backup, MySQL 8

Description: Learn how to use the MySQL 8 CLONE plugin to instantly provision replicas or create physical backups by cloning a running MySQL instance.

---

## What Is the CLONE Plugin

The MySQL CLONE plugin, available in MySQL 8.0.17+, allows you to copy the entire InnoDB data set from one MySQL instance to another - or to a local directory - while the source server is running. It is particularly useful for:

- Quickly provisioning new replicas without a full mysqldump.
- Creating a physical backup of InnoDB tables.
- Bootstrapping a Group Replication node.

## Installing the CLONE Plugin

```sql
INSTALL PLUGIN clone SONAME 'mysql_clone.so';
```

Verify it is loaded:

```sql
SELECT PLUGIN_NAME, PLUGIN_STATUS
FROM INFORMATION_SCHEMA.PLUGINS
WHERE PLUGIN_NAME = 'clone';
```

## Required Privileges

On the donor (source):

```sql
CREATE USER 'clone_user'@'%' IDENTIFIED BY 'StrongPass!1';
GRANT BACKUP_ADMIN ON *.* TO 'clone_user'@'%';
```

On the recipient (target):

```sql
GRANT CLONE_ADMIN ON *.* TO 'clone_user'@'%';
```

## Local Clone - Clone to a Directory on the Same Server

```sql
CLONE LOCAL DATA DIRECTORY = '/mysql/clone_backup';
```

This creates a full physical copy of InnoDB data in the specified directory. The directory must not already exist.

## Remote Clone - Clone from a Donor Instance

On the recipient server, run:

```sql
CLONE INSTANCE FROM 'clone_user'@'donor_host':3306
  IDENTIFIED BY 'StrongPass!1';
```

The recipient server will:
1. Connect to the donor.
2. Transfer all InnoDB tablespace files.
3. Restart itself with the cloned data.

Both donor and recipient must run the same MySQL version and the same operating system bit width.

## Monitoring Clone Progress

```sql
SELECT
  STAGE,
  STATE,
  BEGIN_TIME,
  END_TIME,
  ESTIMATE,
  DATA,
  NETWORK
FROM performance_schema.clone_progress;
```

For overall clone status:

```sql
SELECT * FROM performance_schema.clone_status;
```

## Cloning for Replica Provisioning

After a successful remote clone, the recipient contains the donor's binary log position. Use it to start replication:

```sql
-- On the recipient, after clone completes:
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = 'donor_host',
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'ReplPass!1',
  SOURCE_AUTO_POSITION = 1;

START REPLICA;
```

With GTID-based replication (`SOURCE_AUTO_POSITION = 1`), no manual log file or position is needed because the clone includes the executed GTID set.

## Cloning with a Specific Data Directory

```sql
-- Specify destination directory explicitly (local clone)
CLONE LOCAL DATA DIRECTORY = '/backup/2026-03-31-clone';
```

Then use the cloned directory to start a standalone MySQL instance for testing:

```bash
mysqld --datadir=/backup/2026-03-31-clone --port=3307 &
```

## Restrictions and Considerations

- Only InnoDB tables are cloned. MyISAM or other engine tables are not included.
- The recipient server restarts automatically during a remote clone - plan accordingly.
- The clone operation holds a brief backup lock at the start on the donor.
- The donor and recipient must have the same set of plugins installed.

## Viewing Clone Configuration

```sql
SHOW VARIABLES LIKE 'clone%';
```

Useful variables:

```text
clone_autotune_concurrency    - auto-tune parallel threads
clone_max_concurrency         - max parallel threads (default 16)
clone_ssl_ca / clone_ssl_cert - SSL configuration for secure clone
clone_valid_donor_list        - restrict which donors can be cloned from
```

## Summary

The MySQL CLONE plugin dramatically simplifies replica provisioning and physical backup creation by streaming a live physical copy of InnoDB data between servers. It eliminates the need for slow logical dumps when adding new replicas, and integrates directly with GTID-based replication for a smooth setup experience. Always verify that both donor and recipient run compatible MySQL versions before cloning.

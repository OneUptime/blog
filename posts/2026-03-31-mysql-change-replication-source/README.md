# How to Use CHANGE REPLICATION SOURCE Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Administration

Description: Learn how to use CHANGE REPLICATION SOURCE in MySQL 8 to configure replica connections, set binary log positions, and enable GTID-based replication.

---

## What Is CHANGE REPLICATION SOURCE

`CHANGE REPLICATION SOURCE TO` (introduced in MySQL 8.0.23 as a replacement for `CHANGE MASTER TO`) configures a replica server's connection to its source (primary) server. It sets the hostname, port, credentials, and starting position for replication. This command is essential when setting up replication for the first time, switching to a new primary, or recovering from replication errors.

```sql
CHANGE REPLICATION SOURCE TO option [, option] ...;
```

## Basic Syntax

The most common options:

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = 'primary.example.com',
  SOURCE_PORT = 3306,
  SOURCE_USER = 'replication_user',
  SOURCE_PASSWORD = 'secure_password',
  SOURCE_LOG_FILE = 'mysql-bin.000001',
  SOURCE_LOG_POS = 4;
```

The replica must be stopped before running this command:

```sql
STOP REPLICA;
CHANGE REPLICATION SOURCE TO ...;
START REPLICA;
```

## Setting Up Replication from a Binary Log Position

When you have a mysqldump with `--source-data` (called `--master-data` before MySQL 8.0.26), the dump includes the binary log coordinates:

```bash
mysqldump --single-transaction --source-data=2 -u root -p mydb > mydb_backup.sql
```

The dump file contains a comment like:

```text
-- CHANGE REPLICATION SOURCE TO SOURCE_LOG_FILE='mysql-bin.000010', SOURCE_LOG_POS=1234;
```

Use those coordinates on the replica:

```sql
STOP REPLICA;
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '10.0.0.10',
  SOURCE_USER = 'repl',
  SOURCE_PASSWORD = 'replpass',
  SOURCE_LOG_FILE = 'mysql-bin.000010',
  SOURCE_LOG_POS = 1234;
START REPLICA;
```

## GTID-Based Replication

With GTIDs enabled, you do not need to specify binary log file and position. Instead, use `SOURCE_AUTO_POSITION`:

```sql
STOP REPLICA;
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = 'primary.example.com',
  SOURCE_PORT = 3306,
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'secure_pass',
  SOURCE_AUTO_POSITION = 1;
START REPLICA;
```

MySQL will automatically negotiate which transactions need to be replicated based on the GTID sets.

## Configuring SSL for Replication

For encrypted replication connections:

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = 'primary.example.com',
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'pass',
  SOURCE_SSL = 1,
  SOURCE_SSL_CA = '/etc/mysql/ssl/ca-cert.pem',
  SOURCE_SSL_CERT = '/etc/mysql/ssl/replica-cert.pem',
  SOURCE_SSL_KEY = '/etc/mysql/ssl/replica-key.pem',
  SOURCE_AUTO_POSITION = 1;
```

## Changing the Primary Server

When promoting a new primary (failover), update the replica configuration:

```sql
STOP REPLICA;
RESET REPLICA;
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = 'new-primary.example.com',
  SOURCE_PORT = 3306,
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'pass',
  SOURCE_AUTO_POSITION = 1;
START REPLICA;
SHOW REPLICA STATUS\G
```

## Configuring Replication Channels

MySQL supports multiple replication channels for multi-source replication:

```sql
CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = 'source1.example.com',
  SOURCE_USER = 'repl',
  SOURCE_PASSWORD = 'pass',
  SOURCE_AUTO_POSITION = 1
FOR CHANNEL 'source1';

CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = 'source2.example.com',
  SOURCE_USER = 'repl',
  SOURCE_PASSWORD = 'pass',
  SOURCE_AUTO_POSITION = 1
FOR CHANNEL 'source2';

START REPLICA FOR CHANNEL 'source1';
START REPLICA FOR CHANNEL 'source2';
```

## Verifying the Configuration

After applying the configuration:

```sql
SHOW REPLICA STATUS\G
```

Check that `Replica_IO_Running` and `Replica_SQL_Running` are both `Yes` and `Last_Error` is empty.

## Summary

`CHANGE REPLICATION SOURCE TO` is the central command for configuring MySQL replication connections. Use binary log position coordinates for classic replication or `SOURCE_AUTO_POSITION=1` for GTID-based replication. Always stop the replica before modifying its configuration and verify with `SHOW REPLICA STATUS` afterward.

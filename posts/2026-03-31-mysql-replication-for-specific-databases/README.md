# How to Set Up Replication for Specific Databases in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Filter, Database, Configuration

Description: Learn how to configure MySQL replication filters to replicate only specific databases using binlog-do-db and replicate-do-db options.

---

By default, MySQL replication applies all changes from the source to the replica. In some scenarios, you may want to replicate only specific databases - for example, replicating a production database to a separate analytics server while excluding internal system databases. MySQL provides filtering options on both the source and replica sides.

## Two Approaches: Source-Side vs. Replica-Side Filtering

**Source-side filtering** (`binlog-do-db`, `binlog-ignore-db`): Controls which databases are written to the binary log. Changes to excluded databases are never recorded and cannot be replicated. This reduces binary log size but limits future flexibility.

**Replica-side filtering** (`replicate-do-db`, `replicate-ignore-db`): Controls which databases the replica applies. The source writes everything to the binary log, but the replica filters what it executes. This is more flexible and generally preferred.

## Source-Side Filtering

Configure in `my.cnf` on the source server:

```ini
[mysqld]
# Only log changes to these databases
binlog-do-db = myapp_db
binlog-do-db = myapp_audit

# Or exclude specific databases
# binlog-ignore-db = internal_db
# binlog-ignore-db = sys
```

**Important caveat**: With statement-based logging, `binlog-do-db` filters based on the current default database (`USE db_name`), not the actual database in the statement. This can cause missed events:

```sql
USE other_db;
UPDATE myapp_db.orders SET status = 'shipped' WHERE id = 1;
-- With statement-based logging, this update is NOT logged because the default database is other_db
```

With row-based logging (the default in MySQL 8.0), `binlog-do-db` checks the database of the table being modified, so the above statement would be logged correctly. Always verify which binary logging format your server uses (`binlog_format`).

## Replica-Side Filtering

Configure in `my.cnf` on the replica:

```ini
[mysqld]
# Only apply changes for these databases
replicate-do-db = myapp_db
replicate-do-db = myapp_audit

# Or exclude specific databases
# replicate-ignore-db = internal_db
```

With statement-based logging, the same `USE db_name` caveat applies to `replicate-do-db`. With row-based logging (MySQL 8.0 default), `replicate-do-db` checks the database of the table being modified. For safer filtering regardless of binary log format, use table-level filters:

```ini
[mysqld]
# Replicate only specific tables
replicate-do-table = myapp_db.orders
replicate-do-table = myapp_db.customers

# Or use wildcards
replicate-wild-do-table = myapp_db.%
```

## Setting Filters Dynamically

In MySQL 8.0, you can set replica-side filters without restarting:

```sql
STOP REPLICA SQL_THREAD;

CHANGE REPLICATION FILTER
  REPLICATE_DO_DB = (myapp_db, myapp_audit);

START REPLICA SQL_THREAD;
```

Multiple filters in one command:

```sql
CHANGE REPLICATION FILTER
  REPLICATE_DO_DB = (myapp_db),
  REPLICATE_IGNORE_DB = (test, information_schema),
  REPLICATE_WILD_DO_TABLE = ('myapp_db.%');
```

## Viewing Active Filters

```sql
SHOW REPLICA STATUS\G
-- Look for: Replicate_Do_DB, Replicate_Ignore_DB, Replicate_Do_Table
```

Or query directly:

```sql
SELECT * FROM performance_schema.replication_applier_filters;
```

## Setting Up Database-Specific Replication

Full setup example for replicating only `myapp_db` to an analytics replica:

On the replica:

```sql
STOP REPLICA;

CHANGE REPLICATION SOURCE TO
  SOURCE_HOST = '192.168.1.10',
  SOURCE_USER = 'repl_user',
  SOURCE_PASSWORD = 'ReplPassword',
  SOURCE_AUTO_POSITION = 1;

CHANGE REPLICATION FILTER
  REPLICATE_WILD_DO_TABLE = ('myapp_db.%');

START REPLICA;
SHOW REPLICA STATUS\G
```

## Verifying Filtered Replication

Confirm that changes to filtered databases are not applied:

```sql
-- On source
CREATE DATABASE should_not_replicate;
CREATE TABLE should_not_replicate.test (id INT);
INSERT INTO should_not_replicate.test VALUES (1);

-- On replica (should not exist)
SHOW DATABASES LIKE 'should_not_replicate';
```

## Summary

Replica-side filtering with `replicate-wild-do-table` is the safest and most flexible approach for replicating specific databases. Avoid `binlog-do-db` and `replicate-do-db` unless you fully understand the `USE database` caveats that cause them to miss cross-database statements. Use `CHANGE REPLICATION FILTER` in MySQL 8.0 to set and modify filters without restarting the replica. Verify active filters with `SHOW REPLICA STATUS` and test that changes to excluded databases do not appear on the replica.

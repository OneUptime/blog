# What Is MySQL Shell

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MySQL Shell, CLI, InnoDB Cluster, Administration

Description: MySQL Shell is an advanced command-line client for MySQL supporting SQL, JavaScript, and Python modes with built-in InnoDB Cluster management and utility functions.

---

## Overview

MySQL Shell is the next-generation command-line interface for MySQL. Unlike the classic `mysql` client, MySQL Shell supports three execution modes -- SQL, JavaScript, and Python -- in a single tool. It provides the `dba` API for managing InnoDB Cluster and ReplicaSets, the `util` API for high-performance data import/export, and the `X DevAPI` for document store operations.

## Installing MySQL Shell

```bash
# Ubuntu/Debian
apt install mysql-shell

# RHEL/CentOS
yum install mysql-shell

# macOS
brew install mysql-shell
```

Connect to a MySQL instance:

```bash
mysqlsh root@localhost:3306
```

## Three Execution Modes

Switch between modes using `\sql`, `\js`, and `\py`:

```text
MySQL JS> \sql
Switching to SQL mode
MySQL SQL> SELECT VERSION();
MySQL SQL> \js
Switching to JavaScript mode
MySQL JS> session.runSql('SHOW DATABASES')
MySQL JS> \py
Switching to Python mode
MySQL Py> session.run_sql('SHOW TABLES')
```

## SQL Mode

In SQL mode, MySQL Shell behaves like the classic mysql client with some enhancements: syntax highlighting, multi-line editing, and query profiling:

```sql
-- Set vertical output format for easier reading
\option resultFormat=vertical
SELECT * FROM performance_schema.events_statements_summary_by_digest
ORDER BY sum_timer_wait DESC LIMIT 5;
```

## JavaScript and Python Mode

The scripting modes expose MySQL objects as programming APIs:

```javascript
// JavaScript: create a session and run queries
var session = mysqlx.getSession('mysqlx://root@localhost:33060')
var result = session.sql('SELECT COUNT(*) FROM orders').execute()
print(result.fetchOne())
```

```python
# Python: iterate query results
import mysqlsh
shell = mysqlsh.globals.shell
shell.connect('root@localhost:3306')
result = session.run_sql('SELECT id, name FROM products LIMIT 5')
for row in result.fetch_all():
    print(row)
```

## The dba API for Cluster Management

The `dba` object is MySQL Shell's primary tool for InnoDB Cluster and ReplicaSet operations:

```javascript
// Create an InnoDB Cluster
shell.connect('root@node1:3306')
var cluster = dba.createCluster('myCluster')
cluster.addInstance('root@node2:3306')
cluster.addInstance('root@node3:3306')
cluster.status()
```

## The util API for Data Operations

```javascript
// High-performance parallel dump
util.dumpInstance('/backup/dump', {threads: 4, compression: 'zstd'})

// High-performance parallel load
util.loadDump('/backup/dump', {threads: 8, progressFile: '/tmp/progress.json'})

// Import a CSV file into a table
util.importTable('/data/orders.csv', {
  table: 'orders',
  dialect: 'csv-unix',
  columns: ['id', 'customer_id', 'total']
})
```

## The Upgrade Checker

MySQL Shell includes a pre-upgrade compatibility checker:

```javascript
util.checkForServerUpgrade('root@localhost:3306', {
  targetVersion: '8.0',
  outputFormat: 'JSON'
})
```

## Summary

MySQL Shell is a powerful replacement for the classic `mysql` client, offering SQL, JavaScript, and Python execution modes in one tool. Its `dba` API simplifies InnoDB Cluster management, while the `util` API provides high-performance parallel dump and load capabilities that outperform `mysqldump`. It is the recommended client tool for modern MySQL administration and development.

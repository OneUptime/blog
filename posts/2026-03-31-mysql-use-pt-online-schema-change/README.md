# How to Use pt-online-schema-change for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Schema, Migration, Percona, Tool

Description: Learn how to use pt-online-schema-change to alter large MySQL tables without locking, keeping your application running during schema migrations.

---

## What is pt-online-schema-change?

`pt-online-schema-change` (pt-osc) is a Percona Toolkit utility that performs `ALTER TABLE` operations on MySQL tables without blocking reads or writes. It works by creating a shadow copy of the table with the new schema, copying rows in small chunks, and using triggers to keep both tables in sync. When the copy is complete, it renames the tables atomically.

This is essential for production databases where a standard `ALTER TABLE` on a large table would lock it for minutes or hours.

## Installation

Install Percona Toolkit:

```bash
# Ubuntu/Debian
sudo apt-get install percona-toolkit

# CentOS/RHEL
sudo yum install percona-toolkit
```

## Basic Syntax

```bash
pt-online-schema-change \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --alter="ADD COLUMN status TINYINT NOT NULL DEFAULT 0" \
  D=mydb,t=orders \
  --execute
```

The `D=mydb,t=orders` specifies the database and table. Without `--execute`, pt-osc performs some safety checks and exits without making changes. Use `--dry-run` to test the full operation before executing.

## Adding an Index Online

```bash
pt-online-schema-change \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --alter="ADD INDEX idx_customer_id (customer_id)" \
  D=mydb,t=orders \
  --execute
```

## Modifying a Column Type

```bash
pt-online-schema-change \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --alter="MODIFY COLUMN description TEXT NOT NULL DEFAULT ''" \
  D=mydb,t=products \
  --execute
```

## Controlling Chunk Size and Load

To limit how aggressively pt-osc copies rows, use the chunk size and sleep options:

```bash
pt-online-schema-change \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --alter="ADD COLUMN tags VARCHAR(255)" \
  --chunk-size=500 \
  --sleep=0.05 \
  D=mydb,t=orders \
  --execute
```

This copies 500 rows at a time and sleeps 50ms between chunks to reduce load.

## Pausing When the Server is Under Load

Use `--max-load` to pause copying when the server exceeds a threshold:

```bash
pt-online-schema-change \
  --max-load="Threads_running=50" \
  --critical-load="Threads_running=100" \
  --alter="DROP COLUMN legacy_field" \
  D=mydb,t=orders \
  --host=127.0.0.1 --user=root --password=secret \
  --execute
```

## Dry Run First

Always do a dry run before executing:

```bash
pt-online-schema-change \
  --alter="ADD COLUMN archived TINYINT DEFAULT 0" \
  D=mydb,t=orders \
  --host=127.0.0.1 --user=root --password=secret \
  --dry-run
```

The dry run prints the generated SQL and checks for issues without making any changes.

## Important Limitations

- Tables must have a primary key (or unique key) for pt-osc to work
- Foreign key handling requires `--alter-foreign-keys-method` to be set
- Triggers on the original table may conflict with pt-osc's internal triggers

For foreign key constraints, use:

```bash
pt-online-schema-change \
  --alter-foreign-keys-method=rebuild_constraints \
  --alter="ADD COLUMN notes TEXT" \
  D=mydb,t=orders \
  --host=127.0.0.1 --user=root --password=secret \
  --execute
```

## Summary

`pt-online-schema-change` is the standard tool for zero-downtime schema changes on busy MySQL tables. Always start with `--dry-run` to validate the operation, tune `--chunk-size` and `--max-load` to protect production performance, and confirm the table has a primary key before running. This tool has saved countless teams from multi-hour maintenance windows caused by blocking `ALTER TABLE` statements.

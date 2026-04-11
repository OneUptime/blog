# What Is pt-online-schema-change for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Schema Migration, Tool, Percona, DDL

Description: pt-online-schema-change is a Percona tool that performs ALTER TABLE operations on large MySQL tables without blocking reads or writes by using triggers and a shadow table.

---

## Overview

`pt-online-schema-change` (pt-osc) is part of the Percona Toolkit and solves a common production problem: running `ALTER TABLE` on a large table acquires a metadata lock that blocks all reads and writes for the duration of the operation, which can take hours on tables with tens of millions of rows. pt-osc works around this by creating a shadow copy of the table with the new schema, copying rows in small batches, and using triggers to keep the copy synchronized with live writes.

## How It Works

1. Creates a new table `_tablename_new` with the desired schema.
2. Adds triggers on the original table - AFTER INSERT, AFTER UPDATE, and AFTER DELETE - that replicate changes to the new table.
3. Copies existing rows in small chunks using an `INSERT ... SELECT` loop.
4. Once the copy is complete, atomically renames the original table to `_tablename_old` and the new table to the original name.
5. Drops the old table (or leaves it for manual cleanup).

The result is a schema change that takes effect with only a brief lock during the final rename step.

## Installation

```bash
# Install Percona Toolkit on Ubuntu/Debian
sudo apt-get install percona-toolkit

# Or download directly
wget https://downloads.percona.com/downloads/percona-toolkit/3.5.7/binary/debian/jammy/x86_64/percona-toolkit_3.5.7-1.jammy_amd64.deb
sudo dpkg -i percona-toolkit_3.5.7-1.jammy_amd64.deb
```

## Basic Usage

Add a column to a large table without downtime:

```bash
pt-online-schema-change \
  --alter "ADD COLUMN last_login DATETIME NULL" \
  --host=db.example.com \
  --user=admin \
  --password=secret \
  D=myapp,t=users \
  --execute
```

Without `--execute`, pt-osc runs in dry-run mode and prints what it would do.

## Adding an Index

```bash
pt-online-schema-change \
  --alter "ADD INDEX idx_created_at (created_at)" \
  --host=localhost \
  --user=root \
  --ask-pass \
  D=myapp,t=orders \
  --execute
```

## Throttling to Reduce Load

```bash
pt-online-schema-change \
  --alter "MODIFY COLUMN description TEXT NOT NULL" \
  --max-load="Threads_running=25" \
  --critical-load="Threads_running=50" \
  --chunk-size=500 \
  --chunk-time=0.5 \
  D=myapp,t=articles \
  --execute
```

- `--max-load` pauses copying when server load exceeds threshold.
- `--critical-load` aborts the operation if the threshold is exceeded.
- `--chunk-size` controls how many rows are copied per batch.
- `--chunk-time` targets each chunk copy to take this many seconds.

## Replication Awareness

pt-osc can check replica lag and pause if replicas fall behind:

```bash
pt-online-schema-change \
  --alter "ADD COLUMN score INT DEFAULT 0" \
  --max-lag=2 \
  --check-slave-lag=replica.example.com \
  D=myapp,t=products \
  --execute
```

## Limitations

- Requires the table to have a primary key or unique index.
- Triggers cannot be stacked on tables that already have triggers in MySQL 5.7 (resolved in MySQL 8.0 with multi-trigger support, but pt-osc requires specific conditions).
- Foreign key handling requires `--alter-foreign-keys-method`, which can be complex.
- Does not work well with tables using `FULLTEXT` indexes in some configurations.

## Comparing With gh-ost

Unlike pt-osc, `gh-ost` does not use triggers - it reads the binary log to capture changes. This makes gh-ost safer on heavily loaded servers but requires binary log access and a more complex setup.

## Summary

pt-online-schema-change is a mature, reliable tool for running schema changes on busy MySQL tables without downtime. By copying rows in throttled batches and using triggers to capture concurrent writes, it avoids the long table locks that make native `ALTER TABLE` impractical on large production tables. It is most appropriate for teams already using Percona Toolkit and for tables without complex trigger or foreign key requirements.

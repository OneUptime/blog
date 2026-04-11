# How to Use pt-online-schema-change for Zero-Downtime Schema Changes in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, pt-online-schema-change, Zero Downtime, Schema Migration

Description: Learn how to use Percona's pt-online-schema-change to alter large MySQL tables without locking, using shadow table and trigger replication.

---

`pt-online-schema-change` (pt-osc) is a Percona Toolkit utility that performs `ALTER TABLE` operations without blocking reads or writes. It creates a shadow table, copies data in chunks, and uses triggers to replicate ongoing changes.

## How pt-osc Works

1. Creates a new shadow table with the desired schema
2. Adds triggers on the original table to copy INSERT/UPDATE/DELETE to the shadow
3. Copies existing rows in small chunks
4. Renames the shadow to replace the original (atomic swap)
5. Drops the old table

## Installation

```bash
# Install Percona Toolkit
apt-get install percona-toolkit     # Debian/Ubuntu
yum install percona-toolkit         # RHEL/CentOS

# Or download directly from Percona
# https://www.percona.com/downloads/percona-toolkit/
```

## Basic Usage

```bash
pt-online-schema-change \
    --host=127.0.0.1 \
    --user=appuser \
    --password=secret \
    --alter="ADD COLUMN phone VARCHAR(20) NULL" \
    --execute \
    D=myapp,t=users
```

Remove `--execute` and add `--dry-run` to preview without making changes.

## Adding an Index

```bash
pt-online-schema-change \
    --host=127.0.0.1 \
    --user=appuser \
    --password=secret \
    --alter="ADD INDEX idx_status_created (status, created_at)" \
    --execute \
    D=myapp,t=orders
```

## Changing a Column Type

```bash
pt-online-schema-change \
    --host=127.0.0.1 \
    --user=appuser \
    --password=secret \
    --alter="MODIFY COLUMN description MEDIUMTEXT NOT NULL" \
    --chunk-size=1000 \
    --sleep=0.01 \
    --execute \
    D=myapp,t=products
```

`--chunk-size` controls rows per chunk. `--sleep` adds a delay between chunks to reduce replication lag.

## Throttle Based on Replication Lag

```bash
pt-online-schema-change \
    --host=127.0.0.1 \
    --user=appuser \
    --password=secret \
    --alter="ADD COLUMN processed TINYINT NOT NULL DEFAULT 0" \
    --max-lag=1 \
    --check-interval=5 \
    --execute \
    D=myapp,t=events
```

`--max-lag=1` pauses the copy if replication lag exceeds 1 second.

## Critical Limitations

pt-osc does not work when the table has:
- No primary key
- Foreign keys pointing to it (use `--alter-foreign-keys-method=rebuild_constraints` for this case)
- Triggers already defined (by default)

```bash
# Handle foreign keys automatically
pt-online-schema-change \
    --alter-foreign-keys-method=rebuild_constraints \
    --alter="ADD COLUMN weight DECIMAL(8,3) NULL" \
    --execute \
    D=myapp,t=products
```

## Dry Run First

```bash
pt-online-schema-change \
    --dry-run \
    --alter="ADD COLUMN last_login DATETIME NULL" \
    D=myapp,t=users
```

## Summary

pt-online-schema-change is the standard tool for large-table schema changes in MySQL. It works by creating a shadow table with triggers and copying data in chunks. Use `--max-lag` to protect replicas and `--chunk-size` with `--sleep` to control load. Always do a dry run first and ensure the table has a primary key before running.

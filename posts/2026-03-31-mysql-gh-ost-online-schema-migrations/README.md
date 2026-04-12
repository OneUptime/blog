# How to Use gh-ost for Online Schema Migrations in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, gh-ost, Online Migration, GitHub

Description: Learn how to use GitHub's gh-ost to perform triggerless online schema changes in MySQL with safe cutover and pause/resume support.

---

`gh-ost` (GitHub Online Schema Tooling) is GitHub's alternative to pt-osc. Unlike pt-osc, gh-ost uses the MySQL binary log rather than triggers to capture changes, avoiding the write overhead and lock contention that triggers introduce.

## How gh-ost Works

1. Connects to the MySQL replica to read binary log events
2. Creates a ghost table with the new schema
3. Copies rows in chunks from the original to the ghost table
4. Applies binary log events to keep the ghost table current
5. Performs an atomic table swap at cutover

## Installation

```bash
# Download the binary
curl -L https://github.com/github/gh-ost/releases/download/v1.1.8/gh-ost-binary-linux-amd64-20260310200531.tar.gz | tar xvz
mv gh-ost /usr/local/bin/
```

## Basic Migration

```bash
gh-ost \
  --host=127.0.0.1 \
  --user=ghostuser \
  --password=secret \
  --database=myapp \
  --table=users \
  --alter="ADD COLUMN phone VARCHAR(20) NULL" \
  --allow-on-master \
  --execute
```

`--allow-on-master` is needed when running against the primary directly. In production, gh-ost connects to a replica by default (specify the replica with `--host`). Use `--replica-server-id` to set a unique server ID for the gh-ost process when running multiple concurrent migrations.

## Throttle and Chunk Control

```bash
gh-ost \
  --host=127.0.0.1 \
  --user=ghostuser \
  --password=secret \
  --database=myapp \
  --table=orders \
  --alter="ADD INDEX idx_status (status)" \
  --chunk-size=500 \
  --max-lag-millis=1500 \
  --throttle-control-replicas=replica1:3306 \
  --execute
```

`--max-lag-millis` pauses gh-ost when replication lag on the throttle replica exceeds the threshold.

## Postponing Cutover

```bash
gh-ost \
  --postpone-cut-over-flag-file=/tmp/gh-ost-hold \
  --database=myapp \
  --table=events \
  --alter="ADD COLUMN category_id INT UNSIGNED NULL" \
  --execute &

# gh-ost will pause before the final rename while the file exists
# When ready for cutover during maintenance window:
rm /tmp/gh-ost-hold
```

## Interactive Socket Commands

gh-ost creates a Unix socket during migration for runtime control:

```bash
# Pause the migration
echo throttle | nc -U /tmp/gh-ost.myapp.events.sock

# Resume the migration
echo no-throttle | nc -U /tmp/gh-ost.myapp.events.sock

# Show status
echo status | nc -U /tmp/gh-ost.myapp.events.sock
```

## Noop Mode (Dry Run)

gh-ost runs in noop mode by default when `--execute` is omitted. This validates connectivity, permissions, and the ALTER statement without making changes:

```bash
gh-ost \
  --host=127.0.0.1 \
  --user=ghostuser \
  --password=secret \
  --database=myapp \
  --table=users \
  --alter="ADD COLUMN score INT NOT NULL DEFAULT 0" \
  --allow-on-master
```

## Required MySQL Configuration

```sql
-- Required on the server gh-ost connects to
SET GLOBAL binlog_format = ROW;
SET GLOBAL binlog_row_image = FULL;
```

## Summary

gh-ost performs online schema migrations by reading the binary log rather than using triggers, reducing write overhead on busy tables. Use `--max-lag-millis` to throttle based on replication lag and `--postpone-cut-over-flag-file` to control when the final atomic swap happens. Run gh-ost without `--execute` (noop mode) before every production migration to validate connectivity and permissions.

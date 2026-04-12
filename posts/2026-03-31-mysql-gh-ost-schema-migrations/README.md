# What Is gh-ost for MySQL Schema Migrations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Schema Migration, Tool, GitHub, DDL

Description: gh-ost is GitHub's triggerless online schema migration tool for MySQL that reads the binary log instead of using triggers to capture changes during table copies.

---

## Overview

`gh-ost` (GitHub Online Schema Migrations) is an open-source tool created by GitHub for running ALTER TABLE operations on large MySQL tables with zero downtime. The key difference from trigger-based tools like `pt-online-schema-change` is that gh-ost does not add triggers to your table. Instead, it connects to MySQL's binary log stream (binlog) and reads row-level change events to stay synchronized with live writes while copying data to a shadow table. This makes gh-ost safer on high-write workloads and avoids trigger-related overhead and lock escalation issues.

## How It Works

1. Creates a ghost table `_tablename_gho` with the new schema.
2. Connects to the MySQL binary log as a replica.
3. Begins copying rows from the original table in small, throttled chunks.
4. Simultaneously reads binlog events for the original table and replays them on the ghost table.
5. When the copy is complete and the ghost table has caught up, gh-ost atomically swaps the tables using a two-step lock that lasts milliseconds.

## Installation

```bash
# Download a specific release (check https://github.com/github/gh-ost/releases for the latest)
wget https://github.com/github/gh-ost/releases/download/v1.1.6/gh-ost-binary-linux-amd64-20231207144803.tar.gz
tar -xzf gh-ost-binary-linux-amd64-20231207144803.tar.gz
sudo mv gh-ost /usr/local/bin/
```

## Prerequisites

Binary logging must be enabled with row-based format:

```ini
[mysqld]
log_bin = mysql-bin
binlog_format = ROW
binlog_row_image = FULL
```

## Basic Usage

Add a column to a large table:

```bash
gh-ost \
  --user="admin" \
  --password="secret" \
  --host="db.example.com" \
  --database="myapp" \
  --table="orders" \
  --alter="ADD COLUMN processed_at DATETIME NULL" \
  --execute
```

Without `--execute`, gh-ost performs a dry run.

## Throttling Options

```bash
gh-ost \
  --user="admin" \
  --password="secret" \
  --host="db.example.com" \
  --database="myapp" \
  --table="events" \
  --alter="ADD INDEX idx_user_created (user_id, created_at)" \
  --max-load="Threads_running=20" \
  --critical-load="Threads_running=40" \
  --chunk-size=1000 \
  --max-lag-millis=1500 \
  --execute
```

## Running on a Replica

gh-ost can read the binlog from a replica to reduce load on the primary:

```bash
gh-ost \
  --user="admin" \
  --password="secret" \
  --host="replica.example.com" \
  --assume-master-host="primary.example.com" \
  --database="myapp" \
  --table="users" \
  --alter="ADD COLUMN last_login DATETIME NULL" \
  --execute
```

## Interactive Control

gh-ost creates a Unix socket you can use to pause, throttle, or abort the migration at runtime without stopping the process:

```bash
# Pause the migration
echo "throttle" | nc -U /tmp/gh-ost.myapp.users.sock

# Resume
echo "no-throttle" | nc -U /tmp/gh-ost.myapp.users.sock

# Show status
echo "status" | nc -U /tmp/gh-ost.myapp.users.sock
```

## Postponing the Cutover

gh-ost can complete all data copying and then wait for a manual signal before the final table swap - useful for scheduling the brief lock window:

```bash
gh-ost \
  --postpone-cut-over-flag-file=/tmp/gh-ost.postpone \
  --database="myapp" --table="products" \
  --alter="ADD COLUMN weight_grams INT" \
  --execute &

# When ready to cut over
rm /tmp/gh-ost.postpone
```

## Advantages Over pt-osc

- No triggers, so no trigger-based write amplification or trigger lock contention.
- Tables with existing triggers are not supported by pt-osc either; gh-ost avoids triggers entirely.
- Interactive control socket allows runtime adjustments.
- Safer on very high write rate tables.

## Summary

gh-ost replaces trigger-based schema migrations with a binlog streaming approach that is safer, more controllable, and less intrusive on production workloads. For teams running MySQL on high-traffic applications, gh-ost provides the tooling to run complex schema changes - adding columns, modifying types, adding indexes - with minimal risk and without planned downtime.

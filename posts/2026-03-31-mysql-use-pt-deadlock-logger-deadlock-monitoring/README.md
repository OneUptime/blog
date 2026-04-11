# How to Use pt-deadlock-logger for MySQL Deadlock Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Deadlock, Percona, Monitoring, InnoDB

Description: Learn how to use pt-deadlock-logger to automatically capture and store MySQL InnoDB deadlock information for analysis and alerting.

---

## What is pt-deadlock-logger?

`pt-deadlock-logger` is a Percona Toolkit utility that continuously monitors MySQL for InnoDB deadlocks and records each detected deadlock to a destination table or file. Rather than manually checking `SHOW ENGINE INNODB STATUS` after incidents, pt-deadlock-logger captures deadlock details automatically and persistently, enabling historical analysis and alerting.

## Prerequisites

- Percona Toolkit installed
- A MySQL user with `PROCESS` and `SELECT` privileges (plus `INSERT` for the destination table)
- A table to store deadlock records (the tool can create it automatically)

## Creating the Destination Database

```sql
CREATE DATABASE IF NOT EXISTS percona;
```

## Basic Usage

Start logging deadlocks to the `percona.deadlocks` table:

```bash
pt-deadlock-logger \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --dest h=127.0.0.1,D=percona,t=deadlocks,u=root,p=secret \
  --interval=30 \
  --run-time=3600
```

- `--interval=30` checks for new deadlocks every 30 seconds
- `--run-time=3600` runs for 1 hour then exits (omit for continuous operation)

## Destination Table Schema

The tool auto-creates the `percona.deadlocks` table with this structure:

```sql
CREATE TABLE percona.deadlocks (
  server        CHAR(20)           NOT NULL,
  ts            TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  thread        INT UNSIGNED       NOT NULL,
  txn_id        BIGINT UNSIGNED    NOT NULL,
  txn_time      SMALLINT UNSIGNED  NOT NULL,
  user          CHAR(16)           NOT NULL,
  hostname      CHAR(20)           NOT NULL,
  ip            CHAR(15)           NOT NULL,
  db            CHAR(64)           NOT NULL,
  tbl           CHAR(64)           NOT NULL,
  idx           CHAR(64)           NOT NULL,
  lock_type     CHAR(16)           NOT NULL,
  lock_mode     CHAR(1)            NOT NULL,
  wait_hold     CHAR(1)            NOT NULL,
  victim        TINYINT UNSIGNED   NOT NULL,
  query         TEXT               NOT NULL,
  PRIMARY KEY (server, ts, thread)
) ENGINE=InnoDB;
```

## Querying Deadlock History

Find recent deadlocks:

```sql
SELECT ts, user, db, tbl, idx, lock_mode, victim, query
FROM percona.deadlocks
ORDER BY ts DESC
LIMIT 20;
```

Identify which tables deadlock most frequently:

```sql
SELECT tbl, COUNT(*) AS deadlock_count
FROM percona.deadlocks
GROUP BY tbl
ORDER BY deadlock_count DESC;
```

## Running as a Background Daemon

```bash
nohup pt-deadlock-logger \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --dest h=127.0.0.1,D=percona,t=deadlocks,u=root,p=secret \
  --interval=15 \
  --log=/var/log/pt-deadlock-logger.log &
```

## Printing to stdout Instead of a Table

For debugging or when no destination table is desired:

```bash
pt-deadlock-logger \
  --host=127.0.0.1 \
  --user=root \
  --password=secret \
  --print \
  --interval=10 \
  --run-time=300
```

## Alerting on Deadlock Spikes

Set up a cron job that queries the deadlocks table and sends alerts when the count exceeds a threshold:

```bash
#!/bin/bash
COUNT=$(mysql -u root -psecret percona -se "SELECT COUNT(*) FROM deadlocks WHERE ts > NOW() - INTERVAL 5 MINUTE")
if [ "$COUNT" -gt 10 ]; then
  echo "High deadlock rate: $COUNT in last 5 minutes" | mail -s "MySQL Deadlock Alert" ops@example.com
fi
```

## Summary

`pt-deadlock-logger` turns ephemeral deadlock information from `SHOW ENGINE INNODB STATUS` into a persistent, queryable history. Deploy it as a background daemon on production servers, query the destination table regularly to identify deadlock patterns, and use the table data to correlate deadlock spikes with application deployments or traffic changes.

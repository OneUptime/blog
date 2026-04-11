# How to Use pt-archiver for MySQL Data Archival

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Archive, Percona, Data Management, Performance

Description: Learn how to use pt-archiver to archive or delete rows from large MySQL tables in small chunks without impacting production query performance.

---

## What is pt-archiver?

`pt-archiver` is a Percona Toolkit utility that moves or deletes rows from MySQL tables in small, controlled chunks. It is designed for archiving old data from large production tables to archive tables or flat files without causing long-running locks or excessive I/O that would impact application performance. It can insert archived rows into another table (on the same or a different server) or write them to a file.

## Basic Syntax

Archive rows older than 90 days from `orders` to an `orders_archive` table:

```bash
pt-archiver \
  --source h=127.0.0.1,D=mydb,t=orders,u=root,p=secret \
  --dest h=127.0.0.1,D=mydb_archive,t=orders_archive,u=root,p=secret \
  --where "created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)" \
  --limit=500 \
  --commit-each \
  --progress=5000 \
  --statistics
```

- `--limit=500` moves 500 rows per chunk
- `--commit-each` commits after each chunk
- `--progress=5000` prints progress every 5000 rows

## Deleting Old Rows Without Archiving

To simply delete old rows without copying them anywhere:

```bash
pt-archiver \
  --source h=127.0.0.1,D=mydb,t=log_events,u=root,p=secret \
  --purge \
  --where "event_time < DATE_SUB(NOW(), INTERVAL 30 DAY)" \
  --limit=1000 \
  --commit-each
```

The `--purge` option deletes rows from the source without inserting them elsewhere.

## Archiving to a File

Archive rows to a tab-delimited file for cold storage or offline analysis:

```bash
pt-archiver \
  --source h=127.0.0.1,D=mydb,t=orders,u=root,p=secret \
  --file /backup/archive/orders_%Y-%m-%d.tsv \
  --where "status='completed' AND created_at < '2024-01-01'" \
  --limit=500 \
  --commit-each \
  --statistics
```

`%Y-%m-%d` in the filename is replaced with the current date. The output format is tab-delimited with `\N` for NULL values (similar to MySQL's SELECT INTO OUTFILE).

## Dry Run

Use `--dry-run` to print the generated queries and exit without making any changes:

```bash
pt-archiver \
  --source h=127.0.0.1,D=mydb,t=orders,u=root,p=secret \
  --dest h=127.0.0.1,D=mydb_archive,t=orders_archive,u=root,p=secret \
  --where "created_at < '2022-01-01'" \
  --dry-run
```

This lets you examine the exact SQL statements pt-archiver will use. For a small live test run, add `--limit` and `--run-time`:

```bash
pt-archiver \
  --source h=127.0.0.1,D=mydb,t=orders,u=root,p=secret \
  --dest h=127.0.0.1,D=mydb_archive,t=orders_archive,u=root,p=secret \
  --where "created_at < '2022-01-01'" \
  --limit=10 \
  --commit-each \
  --statistics \
  --run-time=5
```

`--run-time=5` stops after 5 seconds, useful for testing the configuration.

## Controlling Archival Speed

To reduce load on the server, add sleep between chunks:

```bash
pt-archiver \
  --source h=127.0.0.1,D=mydb,t=orders,u=root,p=secret \
  --purge \
  --where "created_at < DATE_SUB(NOW(), INTERVAL 180 DAY)" \
  --limit=200 \
  --sleep=1 \
  --commit-each
```

`--sleep=1` waits 1 second between each chunk.

## Typical Statistics Output

```text
Started at 2026-03-31T10:00:00, ended at 2026-03-31T10:05:30
Source: A=utf8mb4,D=mydb,h=127.0.0.1,p=...,t=orders,u=root
SELECT 200000
INSERT 200000
DELETE 200000
Action             Count       Time        Pct
sleep              399         39.90       12.10
commit             400          3.20        0.97
select             400          8.55        2.59
inserting          400         12.30        3.73
deleting           400         11.80        3.58
```

## Summary

`pt-archiver` is the safest way to remove old data from large MySQL tables in production. Always define a precise `--where` clause, start with a small `--limit` value, use `--commit-each` to avoid long transactions, and test on a staging environment first. Adding `--sleep` between chunks helps protect I/O-sensitive workloads from archival overhead.

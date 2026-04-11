# How to Use pt-table-checksum for MySQL Replication Consistency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Replication, Checksum, Percona, Consistency

Description: Learn how to use pt-table-checksum to verify data consistency between MySQL master and replica servers by comparing row-level checksums.

---

## What is pt-table-checksum?

`pt-table-checksum` is a Percona Toolkit utility that checks whether MySQL replicas are in sync with their primary (master) by calculating and comparing checksums of table data. It runs on the primary, writes checksum results to a special table, and those results replicate to all replicas. A companion tool, `pt-table-sync`, can fix any detected inconsistencies.

## Prerequisites

- Percona Toolkit installed on the primary server
- Replication running between primary and replica(s)
- A user with `REPLICATION CLIENT`, `PROCESS`, `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and `CREATE` privileges

Create a dedicated user:

```sql
CREATE USER 'ptcheck'@'localhost' IDENTIFIED BY 'strongpassword';
GRANT REPLICATION CLIENT, PROCESS, SELECT, INSERT, UPDATE, DELETE, CREATE ON *.* TO 'ptcheck'@'localhost';
FLUSH PRIVILEGES;
```

## Running a Basic Checksum

Run from the primary server:

```bash
pt-table-checksum \
  --host=127.0.0.1 \
  --user=ptcheck \
  --password=strongpassword \
  --databases=mydb
```

`pt-table-checksum` creates a `percona.checksums` table (if it does not exist) and writes results there. The tool then waits for replicas to apply the checksums and compares them.

## Checking All Databases

```bash
pt-table-checksum \
  --host=127.0.0.1 \
  --user=ptcheck \
  --password=strongpassword \
  --replicate=percona.checksums \
  --no-check-binlog-format
```

The `--no-check-binlog-format` flag skips the binlog format check, useful when using `ROW`-based replication.

## Reading Results

After the run, query the checksum table to find differences:

```sql
SELECT db, tbl, chunk, this_cnt, source_cnt, this_crc, source_crc
FROM percona.checksums
WHERE source_cnt <> this_cnt
   OR source_crc <> this_crc
   OR ISNULL(source_crc) <> ISNULL(this_crc);
```

The `DIFFS` column in the tool output summary also shows the number of differing chunks per table.

## Limiting Which Tables to Check

Check only specific tables to reduce load:

```bash
pt-table-checksum \
  --host=127.0.0.1 \
  --user=ptcheck \
  --password=strongpassword \
  --tables=mydb.orders,mydb.customers
```

## Controlling Chunk Size and Replica Lag

```bash
pt-table-checksum \
  --host=127.0.0.1 \
  --user=ptcheck \
  --password=strongpassword \
  --chunk-size=1000 \
  --max-lag=2s \
  --databases=mydb
```

`--max-lag=2s` pauses checksumming if any replica falls more than 2 seconds behind.

## Sample Summary Output

```text
TS ERRORS DIFFS ROWS DIFF_ROWS CHUNKS SKIPPED TIME TABLE
03-31T10:00:01      0     0   50000        0      50       0 10.5 mydb.orders
03-31T10:00:12      0     2   80000     1200      80       0 15.2 mydb.customers
```

A non-zero `DIFFS` value means data differs between primary and replica for that table. Use `pt-table-sync` to repair.

## Summary

`pt-table-checksum` is the most reliable way to detect replication drift in MySQL environments. Run it regularly as a cron job, tune `--chunk-size` and `--max-lag` to protect replica performance, and always review the checksums table output when `DIFFS` is non-zero. Pair it with `pt-table-sync` to fix any detected inconsistencies.

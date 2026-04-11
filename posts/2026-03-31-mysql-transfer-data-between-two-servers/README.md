# How to Transfer Data Between Two MySQL Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Data Transfer, Migration, mysqldump, Replication

Description: Learn how to transfer tables and databases between two MySQL servers using mysqldump piping, FEDERATED tables, and replication-based approaches.

---

## Introduction

Transferring data between MySQL servers is a common task during migrations, environment promotions, or DR setup. The right method depends on dataset size, acceptable downtime, and whether you need a one-time copy or ongoing synchronization.

## Method 1: Pipe mysqldump Directly

The simplest approach for small to medium databases - dump and restore in a single command:

```bash
mysqldump -h source-host -u root -p source_db | \
  mysql -h dest-host -u root -p dest_db
```

For larger datasets, add compression:

```bash
mysqldump -h source-host -u root -p source_db | \
  gzip | \
  ssh user@dest-host "gunzip | mysql -u root -p dest_db"
```

## Method 2: Dump to File and Transfer

For more control, dump to a file first, then copy and restore:

```bash
# On source server
mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  -h source-host -u root -p source_db > /tmp/source_db.sql

# Transfer the file
scp /tmp/source_db.sql user@dest-host:/tmp/

# On destination server
mysql -u root -p dest_db < /tmp/source_db.sql
```

## Method 3: Transfer a Single Table

To move just one table between servers:

```bash
# Dump the table
mysqldump -h source-host -u root -p source_db customers > /tmp/customers.sql

# Restore on destination
mysql -h dest-host -u root -p dest_db < /tmp/customers.sql
```

## Method 4: Use MySQL FEDERATED Engine

Create a FEDERATED table on the destination server to read directly from the source:

```sql
-- On destination server
CREATE TABLE remote_customers (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(150)
) ENGINE=FEDERATED
CONNECTION='mysql://user:pass@source-host:3306/source_db/customers';

-- Copy data locally
INSERT INTO local_customers SELECT * FROM remote_customers;
```

## Method 5: Use mydumper/myloader for Speed

For large databases, mydumper exports in parallel and myloader imports in parallel:

```bash
# Export from source (8 threads)
mydumper \
  --host=source-host \
  --user=root \
  --password=password \
  --database=source_db \
  --threads=8 \
  --outputdir=/tmp/dump

# Transfer dump directory
rsync -avz /tmp/dump/ user@dest-host:/tmp/dump/

# Import on destination (8 threads)
myloader \
  --host=dest-host \
  --user=root \
  --password=password \
  --directory=/tmp/dump \
  --threads=8
```

## Keeping Track of Transfer Progress

Monitor the restore on the destination:

```sql
SHOW PROCESSLIST;
SELECT table_name, table_rows
FROM information_schema.tables
WHERE table_schema = 'dest_db'
ORDER BY table_rows DESC;
```

## Method 6: Point-in-Time Using Binary Logs

For zero-data-loss transfers on active servers, combine mysqldump with binary log position:

```bash
mysqldump \
  --single-transaction \
  --source-data=2 \
  -h source-host -u root -p source_db > /tmp/full_dump.sql

# The dump file contains a CHANGE REPLICATION SOURCE TO comment with the binlog position
head -50 /tmp/full_dump.sql | grep -i "SOURCE_LOG"
```

## Summary

For small to medium databases, piping `mysqldump` directly to `mysql` is the fastest approach. For large databases, mydumper/myloader with multiple threads reduces transfer time significantly. When you need ongoing synchronization rather than a one-time copy, set up MySQL replication using the binary log position captured during the initial dump.

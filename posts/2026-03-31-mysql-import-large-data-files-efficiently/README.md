# How to Import Large Data Files into MySQL Efficiently

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Import, Performance, Bulk Load, Optimization

Description: Learn techniques for efficiently importing large CSV and SQL dump files into MySQL, including InnoDB tuning, disabling constraints, and parallel loading.

---

## Introduction

Importing millions of rows into MySQL can take hours if done naively. With the right configuration changes - disabling indexes during load, tuning InnoDB settings, and batching inserts - you can reduce import time by 10x or more. This guide covers the key techniques.

## Use LOAD DATA INFILE Instead of INSERT

`LOAD DATA INFILE` is the fastest single-threaded import method, significantly faster than row-by-row INSERTs:

```sql
LOAD DATA INFILE '/tmp/large_dataset.csv'
INTO TABLE transactions
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
```

## Disable Indexes During Import

Dropping secondary indexes before bulk load and recreating them after is much faster than maintaining them incrementally.

Note: `ALTER TABLE ... DISABLE KEYS` / `ENABLE KEYS` only affects MyISAM tables and has no effect on InnoDB. For InnoDB tables, explicitly drop and recreate secondary indexes:

```sql
-- Before import: drop secondary indexes
ALTER TABLE transactions DROP INDEX idx_customer_id;

-- Run LOAD DATA INFILE here

-- After import: recreate indexes
ALTER TABLE transactions ADD INDEX idx_customer_id (customer_id);
```

## Tune InnoDB Settings for Bulk Import

Set these session variables before importing:

```sql
SET unique_checks = 0;
SET foreign_key_checks = 0;
SET autocommit = 0;
```

And configure the InnoDB buffer pool large enough to fit working data:

```bash
# In my.cnf for a temporary import boost
innodb_buffer_pool_size = 4G
innodb_log_file_size = 512M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT
```

## Commit After Import

After a large `LOAD DATA INFILE` with `autocommit = 0`:

```sql
COMMIT;
SET autocommit = 1;
SET unique_checks = 1;
SET foreign_key_checks = 1;
```

## Split Large Files into Chunks

For very large files (>10 GB), split into manageable chunks:

```bash
# Split into 500,000-row files (keeping header in each)
head -1 large_dataset.csv > header.csv
split -l 500000 <(tail -n +2 large_dataset.csv) chunk_

# Prepend header to each chunk
for f in chunk_*; do
  cat header.csv "$f" > "${f}_with_header.csv"
  rm "$f"
done
```

Then import each chunk:

```bash
for f in chunk_*_with_header.csv; do
  mysql -u root -p mydb --local-infile=1 -e "
    LOAD DATA LOCAL INFILE '$f'
    INTO TABLE transactions
    FIELDS TERMINATED BY ','
    OPTIONALLY ENCLOSED BY '\"'
    LINES TERMINATED BY '\n'
    IGNORE 1 ROWS;
  "
  echo "Imported $f"
done
```

## Using mydumper and myloader for Parallel Import

mydumper/myloader supports parallel import using multiple threads:

```bash
# Install myloader
sudo apt install mydumper

# Import with 8 parallel threads
myloader \
  --host=localhost \
  --user=root \
  --password=password \
  --directory=/tmp/dump/ \
  --threads=8 \
  --overwrite-tables
```

## Monitoring Import Progress

Track progress for long-running imports:

```sql
-- Enable stage event instruments (run once per session)
UPDATE performance_schema.setup_instruments SET ENABLED = 'YES' WHERE NAME LIKE 'stage/%';
UPDATE performance_schema.setup_consumers SET ENABLED = 'YES' WHERE NAME LIKE 'events_stages_%';

-- Check progress of running stages
SELECT
  EVENT_NAME AS stage,
  WORK_COMPLETED AS completed,
  WORK_ESTIMATED AS estimated
FROM performance_schema.events_stages_current
WHERE WORK_ESTIMATED > 0;
```

For InnoDB import progress:

```sql
SHOW ENGINE INNODB STATUS\G
```

## Summary

Efficient large-file imports into MySQL rely on combining `LOAD DATA INFILE` with InnoDB tuning: disabling `unique_checks` and `foreign_key_checks`, setting `autocommit = 0`, and increasing `innodb_buffer_pool_size`. For files exceeding a few gigabytes, split them into chunks or use mydumper/myloader for parallel multi-threaded loading. Always rebuild indexes after import rather than maintaining them during the load.

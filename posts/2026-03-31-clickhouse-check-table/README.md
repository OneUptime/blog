# How to Use CHECK TABLE in ClickHouse for Data Integrity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, CHECK TABLE, Data Integrity

Description: Learn how to verify ClickHouse table integrity using CHECK TABLE, interpret checksum results, and take action when corrupt parts are detected.

---

Hardware failures, network interruptions, and software bugs can occasionally leave ClickHouse data parts in an inconsistent state. CHECK TABLE provides a way to verify the integrity of all data parts in a table by comparing stored checksums against recalculated values. This post explains the syntax, how to interpret the output, and what to do when corruption is detected.

## Basic CHECK TABLE Syntax

```sql
CHECK TABLE analytics.events;
```

ClickHouse reads every active data part in the table, recalculates checksums for all column files and index files, and compares them against the checksums stored in `checksums.txt` inside each part. By default, the query returns a single `result` column: `1` if every part passed and `0` if any part failed.

### Output Columns

To get one row per part with detailed information, set `check_query_single_value_result = 0`:

```sql
CHECK TABLE analytics.events SETTINGS check_query_single_value_result = 0;
```

| Column | Type | Description |
|--------|------|-------------|
| part_path | String | Path to the data part on disk |
| is_passed | UInt8 | 1 if the part is intact, 0 if corrupt |
| message | String | Empty string or error description |

```sql
-- Show only failed parts
SELECT part_path, message
FROM (CHECK TABLE analytics.events SETTINGS check_query_single_value_result = 0)
WHERE NOT is_passed;
```

## CHECK TABLE PARTITION

To limit the check to a single partition, use the PARTITION clause:

```sql
CHECK TABLE analytics.events PARTITION '2026-03';
```

This is much faster than checking the entire table and is useful when you suspect a specific time range was affected by a hardware event.

## What CHECK TABLE Validates

- Column data file checksums (`.bin` files)
- Compression block integrity
- Mark file checksums (`.mrk` files)
- Primary index file checksums (`primary.idx`)
- Skip index file checksums where applicable
- Metadata consistency (`columns.txt`, `count.txt`)

CHECK TABLE does not repair data. It only reports what is wrong.

## Interpreting the Results

A clean table returns all rows with `is_passed = 1`:

```sql
CHECK TABLE analytics.events SETTINGS check_query_single_value_result = 0;
-- part_path                            | is_passed | message
-- all_1_10_2                           | 1         |
-- all_11_20_3                          | 1         |
```

A corrupted part shows `is_passed = 0` with an error message:

```text
-- all_21_30_1   | 0  | Checksum mismatch in file events/all_21_30_1/created_at.bin
```

## Repair Procedures

ClickHouse does not have a built-in REPAIR TABLE command. When a corrupt part is found, the recovery options are:

### Option 1 - Fetch from a Replica

For ReplicatedMergeTree tables, a healthy replica holds the same parts. Force ClickHouse to re-fetch the corrupt part:

```sql
-- Detach the corrupt part so ClickHouse marks it for re-fetch
ALTER TABLE analytics.events DETACH PART 'all_21_30_1';

-- Trigger replica sync
SYSTEM SYNC REPLICA analytics.events;
```

ClickHouse will fetch the missing part from another replica automatically.

### Option 2 - Drop and Re-insert the Partition

If no healthy replica exists and you have a backup, drop the corrupt partition and reload from the backup:

```sql
-- Drop the corrupt partition
ALTER TABLE analytics.events DROP PARTITION '2026-03';

-- Re-insert from backup or source
INSERT INTO analytics.events
SELECT * FROM analytics.events_backup
WHERE toYYYYMM(created_at) = 202603;
```

### Option 3 - Detach Broken Parts

If you cannot restore, detach the corrupt parts to prevent query errors and investigate offline:

```sql
ALTER TABLE analytics.events DETACH PART 'all_21_30_1';
```

The part files move to the `detached/` subdirectory on disk for manual inspection.

## Practical Example - Scheduled Integrity Check

```sql
-- Check all tables in the analytics database for corruption
SELECT
    c.database,
    c.table,
    countIf(NOT c.is_passed) AS corrupt_parts,
    count()                  AS total_parts
FROM
(
    SELECT
        'analytics'         AS database,
        'events'            AS table,
        is_passed
    FROM (CHECK TABLE analytics.events SETTINGS check_query_single_value_result = 0)

    UNION ALL

    SELECT
        'analytics'         AS database,
        'users'             AS table,
        is_passed
    FROM (CHECK TABLE analytics.users SETTINGS check_query_single_value_result = 0)
) AS c
GROUP BY c.database, c.table
HAVING corrupt_parts > 0;
```

```bash
# Run CHECK TABLE from the CLI and alert on failures
clickhouse-client --query "CHECK TABLE analytics.events SETTINGS check_query_single_value_result = 0" \
  | awk -F'\t' '$2 == 0 {print "CORRUPT: " $1; exit 1}'
```

## Summary

CHECK TABLE in ClickHouse verifies the checksum integrity of every active data part in a table or partition and returns a row per part indicating pass or fail. It is a read-only diagnostic tool and does not repair data. When corruption is detected, the preferred recovery path for replicated tables is to detach the part and let replication restore it from a healthy replica.

# How to Use Partitioning for Data Archival in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Partition, Archive, Data Management, InnoDB

Description: Use MySQL table partitioning to enable instant data archival by dropping old partitions instead of running slow DELETE queries on large tables.

---

## Partitioning as an Archival Strategy

For tables that grow continuously (logs, events, metrics, orders), partition-based archival is the most efficient strategy. Instead of deleting millions of rows with slow DELETE statements, you simply drop an entire partition - an operation that takes milliseconds regardless of partition size.

## Setting Up a Partitioned Table

Create a table partitioned by date range:

```sql
CREATE TABLE events (
  id         BIGINT       NOT NULL AUTO_INCREMENT,
  user_id    BIGINT       NOT NULL,
  event_type VARCHAR(50)  NOT NULL,
  payload    JSON,
  created_at DATETIME     NOT NULL,
  PRIMARY KEY (id, created_at),  -- Partition key must be in PK
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_event_type (event_type, created_at)
)
ENGINE = InnoDB
PARTITION BY RANGE (TO_DAYS(created_at)) (
  PARTITION p_2026_01 VALUES LESS THAN (TO_DAYS('2026-02-01')),
  PARTITION p_2026_02 VALUES LESS THAN (TO_DAYS('2026-03-01')),
  PARTITION p_2026_03 VALUES LESS THAN (TO_DAYS('2026-04-01')),
  PARTITION p_future   VALUES LESS THAN MAXVALUE
);
```

## Adding New Partitions Monthly

Before the `p_future` partition fills up, add a new partition for the upcoming month:

```sql
-- Run at the end of each month to prepare for the next month
ALTER TABLE events REORGANIZE PARTITION p_future INTO (
  PARTITION p_2026_04 VALUES LESS THAN (TO_DAYS('2026-05-01')),
  PARTITION p_future   VALUES LESS THAN MAXVALUE
);
```

Automate this with a stored procedure:

```sql
DELIMITER //

CREATE PROCEDURE add_monthly_partition(IN table_name VARCHAR(64))
BEGIN
  DECLARE next_month_start DATE;
  DECLARE next_month_end   DATE;
  DECLARE partition_name   VARCHAR(20);

  SET next_month_start = DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01');
  SET next_month_end   = DATE_ADD(next_month_start, INTERVAL 1 MONTH);
  SET partition_name   = DATE_FORMAT(next_month_start, 'p_%Y_%m');

  SET @sql = CONCAT(
    'ALTER TABLE ', table_name,
    ' REORGANIZE PARTITION p_future INTO (',
    'PARTITION ', partition_name, ' VALUES LESS THAN (TO_DAYS(''', next_month_end, ''')),',
    'PARTITION p_future VALUES LESS THAN MAXVALUE',
    ')'
  );

  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END //

DELIMITER ;
```

## Archiving Old Partitions

To archive data, first copy the partition to an archive table, then drop it:

```sql
-- Step 1: Create the archive table with the same structure (without partitioning)
CREATE TABLE events_archive LIKE events;
ALTER TABLE events_archive REMOVE PARTITIONING;

-- Step 2: Exchange the old partition with the archive table
--         (instantly moves all rows from the partition to events_archive)
ALTER TABLE events EXCHANGE PARTITION p_2026_01 WITH TABLE events_archive;

-- Step 3: Rename the archive table for historical access
ALTER TABLE events_archive RENAME TO events_2026_01;

-- Step 4: Drop the now-empty partition from the main table
ALTER TABLE events DROP PARTITION p_2026_01;
```

The `EXCHANGE PARTITION` operation is metadata-only - it completes in milliseconds regardless of row count.

## Verifying Partition Contents

Before archiving, verify the partition contains the expected data:

```sql
-- View partition metadata
SELECT partition_name, table_rows, data_length / 1024 / 1024 AS data_mb
FROM information_schema.PARTITIONS
WHERE table_schema = 'myapp' AND table_name = 'events'
ORDER BY partition_name;

-- Count rows in a specific partition (explicit partition selection)
SELECT COUNT(*) FROM events PARTITION (p_2026_01);
```

## Scheduling the Archival Process

```bash
#!/bin/bash
# archive_partition.sh
PARTITION_TO_ARCHIVE="p_2026_01"
ARCHIVE_TABLE="events_2026_01"

mysql -u archive_admin -p"$DB_PASS" myapp -e "
  CREATE TABLE IF NOT EXISTS ${ARCHIVE_TABLE} LIKE events;
  ALTER TABLE ${ARCHIVE_TABLE} REMOVE PARTITIONING;
  ALTER TABLE events EXCHANGE PARTITION ${PARTITION_TO_ARCHIVE} WITH TABLE ${ARCHIVE_TABLE};
  ALTER TABLE events DROP PARTITION ${PARTITION_TO_ARCHIVE};
"
echo "Archived partition $PARTITION_TO_ARCHIVE to $ARCHIVE_TABLE"
```

## Summary

MySQL partition-based archival replaces slow DELETE operations with instant partition exchanges and drops. The workflow involves creating monthly partitions in advance, using `ALTER TABLE ... EXCHANGE PARTITION` to move data to an archive table instantaneously, and dropping the empty partition from the main table. This approach scales to billions of rows with no impact on the time to complete the archival operation.

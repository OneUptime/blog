# How to Handle MySQL Table Fragmentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Fragmentation, Performance, Storage

Description: Learn how to detect, measure, and resolve MySQL InnoDB table fragmentation caused by deletes and updates to reclaim space and restore query performance.

---

## What Is Table Fragmentation?

InnoDB table fragmentation occurs when rows are deleted or updated in a way that leaves gaps in B-tree pages. The pages remain allocated but contain less data than their capacity, wasting storage and increasing the number of pages MySQL must read for range scans.

Two types of fragmentation affect MySQL tables:
- **Internal fragmentation:** Pages are partially filled due to deletes and splits
- **External fragmentation:** The `.ibd` file contains non-contiguous extents on disk

## Detecting Fragmentation

Query `information_schema.TABLES` for free space within a tablespace:

```sql
SELECT
  table_name,
  ROUND(data_length / 1048576, 1) AS data_mb,
  ROUND(data_free / 1048576, 1) AS free_mb,
  ROUND(data_free / (data_length + data_free) * 100, 1) AS pct_free
FROM information_schema.TABLES
WHERE table_schema = 'mydb'
  AND engine = 'InnoDB'
ORDER BY data_free DESC
LIMIT 20;
```

Tables with `pct_free` above 20-30% are good candidates for defragmentation.

## Understanding When Fragmentation Is Harmful

Not all fragmentation harms performance equally:

- **Point lookups (PK or unique index):** Almost unaffected by fragmentation
- **Range scans:** Severely affected - more pages to read for the same result set
- **Full table scans:** Affected proportionally to free page ratio
- **INSERT performance:** High fragmentation can improve insert performance by reusing free page space

Run EXPLAIN to see rows examined for a range query before and after defragmentation:

```sql
EXPLAIN SELECT * FROM orders
WHERE created_at BETWEEN '2025-01-01' AND '2025-03-31';
```

Higher `rows` estimates indicate more pages to scan.

## Measuring Fragmentation with InnoDB Metrics

Use `information_schema.INNODB_METRICS` to check page-level statistics:

```sql
SELECT NAME, COUNT
FROM information_schema.INNODB_METRICS
WHERE NAME IN (
  'index_page_splits',
  'index_page_merge_attempts',
  'index_page_merge_successful'
);
```

High `index_page_splits` relative to inserts indicates pages are fragmenting due to out-of-order inserts.

## Preventing Fragmentation

Use monotonically increasing primary keys (AUTO_INCREMENT or UUID v7) to ensure sequential inserts, which keeps pages full and avoids B-tree splits:

```sql
CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_created (user_id, created_at)
) ENGINE=InnoDB;
```

Random UUIDs as primary keys cause frequent B-tree page splits and high fragmentation.

## Rebuilding Fragmented Tables

The most effective defragmentation is rebuilding the table:

```sql
-- Rebuilds and compacts the table
OPTIMIZE TABLE orders;
```

For large tables on busy systems, use `pt-online-schema-change`:

```bash
pt-online-schema-change \
  --alter "ENGINE=InnoDB" \
  --execute \
  D=mydb,t=orders \
  --user=root \
  --password=secret
```

After the rebuild, re-check fragmentation:

```sql
SELECT table_name, data_free
FROM information_schema.TABLES
WHERE table_schema = 'mydb' AND table_name = 'orders';
```

`data_free` should be near zero after a successful rebuild.

## Summary

MySQL table fragmentation builds up through deletes and random-key inserts. Detect it with `information_schema.TABLES` `data_free` column, and resolve it with `OPTIMIZE TABLE` for smaller tables or `pt-online-schema-change` for large production tables. Prevent future fragmentation by using AUTO_INCREMENT primary keys and scheduling periodic archiving of old data rather than scattered deletes.

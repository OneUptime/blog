# How to Estimate MySQL Table Size Before Creation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Storage, InnoDB, Capacity Planning, Data Type

Description: Learn how to estimate MySQL table size before creation by calculating row size from column data types, factoring in indexes and InnoDB page overhead.

---

## Why Estimate Table Size?

Before deploying a new table to production, estimating its eventual size helps you provision disk space, plan index strategy, and decide whether partitioning or archiving will be needed. A table with 500 million rows and no size estimate can easily surprise a team with a 500 GB storage bill.

## Step 1 - Calculate the Row Size

InnoDB stores rows in 16 KB pages. Row size depends on the data types of each column.

Common data type sizes:

| Data Type | Storage |
|---|---|
| TINYINT | 1 byte |
| INT / INTEGER | 4 bytes |
| BIGINT | 8 bytes |
| FLOAT | 4 bytes |
| DOUBLE | 8 bytes |
| DECIMAL(10,2) | 5 bytes |
| DATE | 3 bytes |
| DATETIME | 5 bytes |
| TIMESTAMP | 4 bytes |
| CHAR(N) | N bytes |
| VARCHAR(N) | 1-2 bytes header + actual content |
| TEXT | 20-byte pointer on-page if stored off-page (DYNAMIC format) |

For a sample `events` table:

```sql
CREATE TABLE events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,  -- 8 bytes
  user_id BIGINT UNSIGNED NOT NULL,            -- 8 bytes
  event_type VARCHAR(50) NOT NULL,             -- avg 20 bytes + 1 header
  metadata JSON,                               -- avg 200 bytes
  created_at DATETIME NOT NULL,               -- 5 bytes
  PRIMARY KEY (id)
) ENGINE=InnoDB;
```

Estimated average row size: `8 + 8 + 21 + 200 + 5 = 242 bytes`

## Step 2 - Factor in InnoDB Overhead

InnoDB stores rows in B-tree pages with overhead per row and per page:
- Row header: ~20 bytes per row
- Page header/trailer: ~200 bytes per 16 KB page
- Page fill factor: InnoDB pages settle at ~69% full with random inserts (sequential bulk loads fill to ~93%)

Adjusted row cost: `242 + 20 = 262 bytes`
Effective bytes per page (69% fill): `16384 * 0.69 = 11305 bytes`
Rows per page: `11305 / 262 = ~43 rows`

## Step 3 - Estimate Data Size for Expected Row Count

```python
avg_row_bytes = 262
fill_factor = 0.69
page_size_bytes = 16384
expected_rows = 100_000_000  # 100 million

rows_per_page = (page_size_bytes * fill_factor) / avg_row_bytes
total_pages = expected_rows / rows_per_page
data_size_gb = (total_pages * page_size_bytes) / 1073741824

print(f"Estimated data size: {data_size_gb:.1f} GB")
# Output: Estimated data size: 35.4 GB
```

## Step 4 - Add Index Size

Each secondary index is a separate B-tree. Estimate index size per row based on the indexed columns:

```sql
-- Index on (user_id, created_at)
-- user_id: 8 bytes, created_at: 5 bytes, pk (id): 8 bytes = 21 bytes per entry
```

Index entry size with overhead: `21 + 20 = 41 bytes`
Index size for 100M rows: `(100_000_000 * 41) / 1073741824 = ~3.8 GB`

Total table size estimate: `35.4 + 3.8 = ~39.2 GB`

## Step 5 - Validate Against a Sample Table

Create the table with a small sample dataset and measure actual size:

```sql
-- Insert 1 million sample rows
INSERT INTO events (user_id, event_type, metadata, created_at)
SELECT
  FLOOR(RAND() * 1000000),
  ELT(FLOOR(RAND() * 3) + 1, 'click', 'view', 'purchase'),
  JSON_OBJECT('page', CONCAT('page_', FLOOR(RAND() * 100))),
  NOW() - INTERVAL FLOOR(RAND() * 365) DAY
FROM information_schema.COLUMNS
LIMIT 1000000;

-- Check actual size
SELECT
  data_length / 1073741824 AS data_gb,
  index_length / 1073741824 AS index_gb
FROM information_schema.TABLES
WHERE table_schema = DATABASE() AND table_name = 'events';
```

Multiply the 1 million row size by your expected row count to get a realistic total estimate.

## Summary

Estimate MySQL table size before creation by summing column data type sizes, adding ~20 bytes InnoDB row overhead, applying a 69% page fill factor, and multiplying by expected row count. Add secondary index sizes separately. Validate your estimate by inserting a sample and measuring with `information_schema.TABLES`, then scale to your target row count for accurate storage provisioning.

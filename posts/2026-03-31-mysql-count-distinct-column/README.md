# How to Use COUNT(DISTINCT column) in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Aggregate Function, Query

Description: Learn how to use COUNT(DISTINCT column) in MySQL to count unique non-NULL values, with examples for multiple columns, performance tips, and GROUP BY usage.

---

## What Is COUNT(DISTINCT)?

`COUNT(DISTINCT column)` counts the number of distinct non-NULL values in a column (or combination of columns) within the result set or group. It combines deduplication with counting in a single aggregate operation.

```sql
COUNT(DISTINCT expr)
COUNT(DISTINCT expr1, expr2, ...)
```

## Basic Usage

```sql
CREATE TABLE page_views (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  page VARCHAR(100),
  session_id VARCHAR(36),
  viewed_at DATETIME
);

INSERT INTO page_views (user_id, page, session_id, viewed_at) VALUES
  (1, '/home', 'sess-a', '2024-01-01 10:00'),
  (1, '/about', 'sess-a', '2024-01-01 10:05'),
  (2, '/home', 'sess-b', '2024-01-01 11:00'),
  (1, '/home', 'sess-c', '2024-01-02 09:00'),
  (3, '/contact', 'sess-d', '2024-01-02 09:30');

-- Count unique users
SELECT COUNT(DISTINCT user_id) AS unique_users FROM page_views;
-- Result: 3

-- Count unique pages visited
SELECT COUNT(DISTINCT page) AS unique_pages FROM page_views;
-- Result: 3
```

## NULL Handling

`COUNT(DISTINCT)` excludes `NULL` values:

```sql
INSERT INTO page_views (user_id, page, session_id, viewed_at) VALUES (NULL, '/home', 'sess-e', NOW());

SELECT COUNT(DISTINCT user_id) FROM page_views;
-- Still 3 - NULL is not counted
```

## Multiple DISTINCT Expressions

Count distinct combinations of columns:

```sql
-- Count distinct (user_id, page) pairs
SELECT COUNT(DISTINCT user_id, page) AS unique_user_page_combos
FROM page_views;
-- Result: 4 (user 1 visited /home and /about, user 2 /home, user 3 /contact)
```

MySQL supports multiple columns in `COUNT(DISTINCT ...)` as a comma-separated list.

## Using with GROUP BY

Count distinct users per page:

```sql
SELECT
  page,
  COUNT(DISTINCT user_id) AS unique_visitors,
  COUNT(*) AS total_views
FROM page_views
GROUP BY page
ORDER BY unique_visitors DESC;
```

Result:

```text
+----------+-----------------+-------------+
| page     | unique_visitors | total_views |
+----------+-----------------+-------------+
| /home    |               2 |           3 |
| /about   |               1 |           1 |
| /contact |               1 |           1 |
+----------+-----------------+-------------+
```

## Combining Multiple DISTINCT Counts

```sql
SELECT
  DATE(viewed_at) AS view_date,
  COUNT(DISTINCT user_id) AS daily_active_users,
  COUNT(DISTINCT session_id) AS daily_sessions,
  COUNT(*) AS total_views
FROM page_views
GROUP BY DATE(viewed_at)
ORDER BY view_date;
```

## Performance Considerations

`COUNT(DISTINCT)` is more expensive than `COUNT(*)` because MySQL must:
1. Read the column values
2. Deduplicate them (sort or hash)
3. Count the unique values

For large tables, this can be slow. Index the column being counted to improve performance:

```sql
ALTER TABLE page_views ADD INDEX idx_user_id (user_id);
```

For very large datasets, approximate counting with HyperLogLog-style techniques may be more practical than exact `COUNT(DISTINCT)`.

## Comparing COUNT(*) vs COUNT(col) vs COUNT(DISTINCT col)

```sql
SELECT
  COUNT(*) AS all_rows,
  COUNT(user_id) AS non_null_user_ids,
  COUNT(DISTINCT user_id) AS unique_user_ids
FROM page_views;
```

## Summary

`COUNT(DISTINCT column)` counts unique non-NULL values in a column, making it essential for metrics like unique visitors, distinct products ordered, or unique error codes seen. It supports multiple column expressions for distinct tuple counting and works correctly with `GROUP BY` for per-group cardinality.

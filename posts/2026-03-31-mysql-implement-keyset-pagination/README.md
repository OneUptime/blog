# How to Implement Keyset (Seek) Pagination in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Pagination, Keyset, Performance, Query

Description: Implement keyset pagination in MySQL for fast, consistent page navigation using indexed column comparisons instead of OFFSET-based pagination.

---

## Why Keyset Pagination?

`LIMIT x OFFSET y` pagination has a well-known performance problem: as OFFSET grows, MySQL must scan and discard all preceding rows before returning results. For page 1000 of 100 rows each, MySQL scans 100,000 rows. Keyset pagination solves this by using the last seen value as a cursor, allowing MySQL to seek directly to the next page using an index.

## Sample Table

```sql
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_id (created_at, id)
);
```

## First Page

For the first page, simply fetch the first N rows:

```sql
SELECT id, name, price, created_at
FROM products
ORDER BY created_at ASC, id ASC
LIMIT 20;
```

Record the `created_at` and `id` of the last row returned. These become your cursor.

## Subsequent Pages - The Seek Method

```sql
-- Page 2: fetch rows after the cursor from page 1
-- (last_created_at = '2024-01-15 10:30:00', last_id = 142)
SELECT id, name, price, created_at
FROM products
WHERE (created_at, id) > ('2024-01-15 10:30:00', 142)
ORDER BY created_at ASC, id ASC
LIMIT 20;
```

MySQL row value comparison `(created_at, id) > (val1, val2)` means: rows where `created_at > val1`, OR `created_at = val1 AND id > val2`. This maps directly to the composite index.

## Verify Index Usage

```sql
EXPLAIN SELECT id, name, price, created_at
FROM products
WHERE (created_at, id) > ('2024-01-15 10:30:00', 142)
ORDER BY created_at ASC, id ASC
LIMIT 20;
```

The output should show `type: range` and `key: idx_created_id` with no `Using filesort`.

## Application Integration Pattern

In a REST API, encode the cursor in the response:

```json
{
  "data": [...],
  "next_cursor": {
    "created_at": "2024-01-15T10:30:00",
    "id": 142
  }
}
```

The next request passes these values back as query parameters.

## Reverse Pagination (Previous Page)

```sql
-- Fetch rows before the cursor (going backwards)
SELECT * FROM (
  SELECT id, name, price, created_at
  FROM products
  WHERE (created_at, id) < ('2024-01-15 10:30:00', 142)
  ORDER BY created_at DESC, id DESC
  LIMIT 20
) sub
ORDER BY created_at ASC, id ASC;
```

The inner query fetches in reverse order, and the outer reverses again to return them in the expected order.

## Keyset with a Single Unique Column

If sorting only by a unique `id`:

```sql
-- Page 1
SELECT * FROM orders ORDER BY id ASC LIMIT 20;

-- Page 2 (last_id = 20)
SELECT * FROM orders WHERE id > 20 ORDER BY id ASC LIMIT 20;
```

## Limitations of Keyset Pagination

- You cannot jump to an arbitrary page number - only next/previous
- The sort column must be indexed and ideally unique (or combined with a unique column)
- Rows inserted before the current cursor position between fetches will be missed; updates to sort columns can cause rows to appear twice or be skipped

## Summary

Keyset pagination in MySQL replaces `OFFSET` with a `WHERE (col1, col2) > (val1, val2)` comparison that leverages a composite index to seek directly to the correct position. This provides constant-time page retrieval regardless of how deep into the result set you are, making it the preferred approach for high-volume, append-heavy tables.

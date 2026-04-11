# How to Implement Paginated Results with Total Count in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Pagination, Query, Performance, Count

Description: Learn how to implement paginated results with a total count in MySQL using LIMIT/OFFSET, SQL_CALC_FOUND_ROWS, and efficient keyset pagination techniques.

---

## Basic LIMIT/OFFSET Pagination

The simplest pagination approach uses `LIMIT` and `OFFSET`:

```sql
-- Page 1 (rows 1-20)
SELECT id, title, created_at
FROM articles
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 0;

-- Page 2 (rows 21-40)
SELECT id, title, created_at
FROM articles
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 20;
```

Always include an `ORDER BY` clause. Without it, the result order is undefined.

## Getting Total Count with Two Queries

Run a separate `COUNT(*)` query to get the total number of matching rows:

```sql
-- Data query
SELECT id, title, created_at
FROM articles
WHERE status = 'published'
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 0;

-- Count query
SELECT COUNT(*) AS total
FROM articles
WHERE status = 'published';
```

Use the same `WHERE` clause in both queries. Run them in parallel if your driver supports it.

## Using SQL_CALC_FOUND_ROWS (Legacy Approach)

MySQL has a hint that calculates the total count during the data query:

```sql
SELECT SQL_CALC_FOUND_ROWS id, title, created_at
FROM articles
WHERE status = 'published'
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

SELECT FOUND_ROWS() AS total;
```

Note: `SQL_CALC_FOUND_ROWS` was deprecated in MySQL 8.0.17 because it disables the LIMIT early-termination optimization, forcing MySQL to process all matching rows to determine the total count. The separate `COUNT(*)` query with an index is usually faster.

## Efficient Pagination with Keyset (Cursor-Based)

`OFFSET` pagination becomes slow on large tables because MySQL must scan and discard `OFFSET` rows. Keyset pagination avoids this by filtering on the last seen value:

```sql
-- First page
SELECT id, title, created_at
FROM articles
WHERE status = 'published'
ORDER BY created_at DESC, id DESC
LIMIT 20;

-- Next page - pass the last row's (created_at, id) as cursor
SELECT id, title, created_at
FROM articles
WHERE status = 'published'
  AND (created_at, id) < ('2025-03-30 10:00:00', 4521)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

Create a composite index to support this query efficiently:

```sql
CREATE INDEX idx_articles_status_date_id
  ON articles (status, created_at DESC, id DESC);
```

## Combining Pagination with Total Count

For a typical API response that includes both items and total count:

```javascript
async function getArticles(page, pageSize, status) {
  const offset = (page - 1) * pageSize;

  const [rows] = await db.execute(
    `SELECT id, title, created_at FROM articles
     WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [status, pageSize, offset]
  );

  const [[{ total }]] = await db.execute(
    'SELECT COUNT(*) AS total FROM articles WHERE status = ?',
    [status]
  );

  return {
    data: rows,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
```

## Performance Tips

- Index the `WHERE` and `ORDER BY` columns together.
- Cache the total count with a short TTL when the table is large and count changes infrequently.
- Switch to keyset pagination for tables with millions of rows where deep `OFFSET` values become slow.
- Use `EXPLAIN` to verify index usage on both the data and count queries.

## Summary

Implement pagination in MySQL using `LIMIT`/`OFFSET` for simple cases and keyset pagination for large tables. Always run a separate `COUNT(*)` query for the total - avoid the deprecated `SQL_CALC_FOUND_ROWS`. Index the status, sort, and ID columns together, and cache counts where appropriate to keep pagination fast at scale.

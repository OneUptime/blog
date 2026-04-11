# How to Use SQL_CALC_FOUND_ROWS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL_CALC_FOUND_ROWS, Pagination, Query

Description: Learn how SQL_CALC_FOUND_ROWS works in MySQL for paginated queries, its performance implications, and the modern alternatives recommended in MySQL 8.0.

---

## What Is SQL_CALC_FOUND_ROWS

`SQL_CALC_FOUND_ROWS` is a MySQL-specific query modifier that, when added to a `SELECT` statement, instructs MySQL to calculate the total number of rows that would have been returned without the `LIMIT` clause. The total can then be retrieved immediately after with `SELECT FOUND_ROWS()`.

This was historically used to implement pagination: run one query to get a page of results and the total count in a single round trip.

## Basic Usage

```sql
-- Paginated query with SQL_CALC_FOUND_ROWS
SELECT SQL_CALC_FOUND_ROWS id, name, email
FROM users
WHERE status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 20 OFFSET 40;

-- Immediately retrieve the total count
SELECT FOUND_ROWS() AS total_count;
```

The first query returns rows 41-60 (page 3, 20 per page). `FOUND_ROWS()` returns the total number of active users, regardless of the `LIMIT`.

## Pagination Helper Pattern

```sql
DELIMITER $$
CREATE PROCEDURE paginate_users(
  IN p_page     INT,
  IN p_per_page INT,
  OUT p_total   BIGINT
)
BEGIN
  DECLARE v_offset INT DEFAULT (p_page - 1) * p_per_page;

  SELECT SQL_CALC_FOUND_ROWS id, name, email, status
  FROM users
  WHERE status = 'ACTIVE'
  ORDER BY created_at DESC
  LIMIT p_per_page OFFSET v_offset;

  SELECT FOUND_ROWS() INTO p_total;
END$$
DELIMITER ;

-- Get page 2 with 10 rows per page
CALL paginate_users(2, 10, @total);
SELECT @total AS total_active_users;
```

## Performance Considerations

`SQL_CALC_FOUND_ROWS` has significant performance costs that are often misunderstood:

- MySQL still scans all matching rows to count them, even though it only returns `LIMIT` rows
- The extra work is roughly equivalent to running the query without `LIMIT`
- This makes it no faster than running two separate queries

In practice, a query with `SQL_CALC_FOUND_ROWS` takes roughly as long as the same query without `LIMIT`, because MySQL must examine all matching rows to produce the count — not just the rows returned by `LIMIT`.

## Deprecated in MySQL 8.0

`SQL_CALC_FOUND_ROWS` and `FOUND_ROWS()` are deprecated in MySQL 8.0.17 and may be removed in a future release. The recommended approach is to run two explicit queries:

```sql
-- Modern approach: two explicit queries
-- Query 1: get page of results
SELECT id, name, email
FROM users
WHERE status = 'ACTIVE'
ORDER BY created_at DESC
LIMIT 20 OFFSET 40;

-- Query 2: count total
SELECT COUNT(*) AS total_count
FROM users
WHERE status = 'ACTIVE';
```

This is often faster in practice because:
- The `COUNT(*)` query can use an index-only scan
- MySQL's optimizer can choose a better plan for each query independently
- Result caching at the application level works independently for each query

## Optimizing the COUNT Query

```sql
-- Ensure there is an index that covers the WHERE clause for fast counting
ALTER TABLE users ADD INDEX idx_status_created (status, created_at);

-- COUNT uses the index and avoids reading the full row
EXPLAIN SELECT COUNT(*) FROM users WHERE status = 'ACTIVE';
-- type: ref, Extra: Using index
```

## Keyset Pagination as an Alternative

For large datasets, keyset pagination avoids `OFFSET` entirely and is faster:

```sql
-- First page
SELECT id, name, email
FROM users
WHERE status = 'ACTIVE'
ORDER BY id ASC
LIMIT 20;

-- Next page: use last id from previous page
SELECT id, name, email
FROM users
WHERE status = 'ACTIVE'
  AND id > 1234  -- last seen id
ORDER BY id ASC
LIMIT 20;
```

Keyset pagination does not require a total count and performs consistently regardless of how deep the page is.

## Summary

`SQL_CALC_FOUND_ROWS` provides a way to retrieve a page of results and the total count in one query, but it scans all matching rows regardless of `LIMIT` and is deprecated in MySQL 8.0.17. The recommended replacement is two explicit queries: one for the page and one for `COUNT(*)`. For large tables, consider keyset pagination to avoid the `OFFSET` performance penalty altogether.

# How to Find Duplicate Rows in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Duplicate, Query, Data Quality, SQL

Description: Learn how to find duplicate rows in MySQL tables using GROUP BY, HAVING, self-joins, and window functions with practical examples.

---

## Why Finding Duplicates Matters

Duplicate rows cause reporting errors, inflate counts, and can violate business logic that assumes uniqueness. Before adding a `UNIQUE` constraint or cleaning data, you need to identify exactly which rows are duplicated and how many copies exist.

## Find Duplicates Using GROUP BY and HAVING

The simplest way to find duplicates is to group by the columns that should be unique and count occurrences:

```sql
SELECT
  email,
  COUNT(*) AS occurrence_count
FROM users
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY occurrence_count DESC;
```

This returns every email address that appears more than once along with how many times it appears.

For composite uniqueness (e.g., a combination of columns):

```sql
SELECT
  first_name,
  last_name,
  date_of_birth,
  COUNT(*) AS occurrence_count
FROM customers
GROUP BY first_name, last_name, date_of_birth
HAVING COUNT(*) > 1;
```

## Find All Duplicate Rows Including Their IDs

The previous query shows which values are duplicated but not which row IDs are affected. Use a self-join to retrieve the full rows:

```sql
SELECT u1.*
FROM users u1
INNER JOIN (
  SELECT email
  FROM users
  GROUP BY email
  HAVING COUNT(*) > 1
) dupes ON u1.email = dupes.email
ORDER BY u1.email, u1.id;
```

This returns every row (including the original and all duplicates) for emails that appear more than once.

## Find Duplicates Using Window Functions

Window functions provide a clean alternative that also lets you rank duplicates:

```sql
SELECT *
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY email
      ORDER BY id
    ) AS row_num
  FROM users
) ranked
WHERE row_num > 1;
```

Rows where `row_num > 1` are the duplicates. Rows where `row_num = 1` are the ones you would keep if deduplicating.

## Find Duplicates Across All Columns

To find completely identical rows (every column value is the same), use:

```sql
SELECT
  col1, col2, col3,
  COUNT(*) AS cnt
FROM your_table
GROUP BY col1, col2, col3
HAVING COUNT(*) > 1;
```

Replace `col1, col2, col3` with all columns in your table. If `id` is an auto-increment primary key, exclude it from the `GROUP BY` since it is always unique.

## Count Total Duplicates

To quickly get a summary of how many duplicate records exist:

```sql
SELECT
  SUM(occurrence_count - 1) AS total_duplicates
FROM (
  SELECT COUNT(*) AS occurrence_count
  FROM users
  GROUP BY email
  HAVING COUNT(*) > 1
) subquery;
```

## Find Duplicates in a Large Table Efficiently

On large tables, add an index on the columns you are checking for duplicates before running GROUP BY queries:

```sql
CREATE INDEX idx_users_email ON users(email);
```

Then run the GROUP BY query. The index allows MySQL to group efficiently without a full table scan.

Check the query execution plan first:

```sql
EXPLAIN SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;
```

Look for `Using index` in the Extra column, which indicates the query is covered by the index.

## Export Duplicate Results for Review

Save duplicate findings to a temporary table for further analysis:

```sql
CREATE TEMPORARY TABLE duplicate_emails AS
SELECT email, COUNT(*) AS cnt
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

SELECT * FROM duplicate_emails ORDER BY cnt DESC;
```

## Summary

The most common way to find duplicate rows in MySQL is `GROUP BY ... HAVING COUNT(*) > 1`, which identifies which values appear multiple times. To retrieve the full row data for duplicates, use a self-join against the grouped results or use `ROW_NUMBER()` window functions. Always add an index on the columns being checked before running deduplication queries on large tables.

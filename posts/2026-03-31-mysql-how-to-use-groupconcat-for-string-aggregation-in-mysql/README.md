# How to Use GROUP_CONCAT() for String Aggregation in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, GROUP_CONCAT, String Aggregation, SQL, Analytics

Description: Learn how to use MySQL GROUP_CONCAT() to aggregate multiple rows into a single comma-separated string, with sorting, distinct values, and length limit handling.

---

## What Is GROUP_CONCAT

`GROUP_CONCAT()` is MySQL's string aggregation function. It concatenates values from multiple rows in a group into a single string - the MySQL equivalent of `STRING_AGG()` in PostgreSQL and SQL Server.

## Basic Syntax

```sql
GROUP_CONCAT([DISTINCT] expr [ORDER BY ...] [SEPARATOR str])
```

## Simple Example: Tags per Article

```sql
CREATE TABLE article_tags (
  article_id INT,
  tag        VARCHAR(50)
);

INSERT INTO article_tags VALUES
  (1, 'mysql'), (1, 'database'), (1, 'sql'),
  (2, 'python'), (2, 'backend'),
  (3, 'mysql'), (3, 'performance');

SELECT
  article_id,
  GROUP_CONCAT(tag) AS tags
FROM article_tags
GROUP BY article_id;
```

```text
+------------+----------------------+
| article_id | tags                 |
+------------+----------------------+
|          1 | mysql,database,sql   |
|          2 | python,backend       |
|          3 | mysql,performance    |
+------------+----------------------+
```

## Custom Separator

```sql
SELECT
  article_id,
  GROUP_CONCAT(tag SEPARATOR ' | ') AS tags
FROM article_tags
GROUP BY article_id;
```

```text
+------------+----------------------------+
| article_id | tags                       |
+------------+----------------------------+
|          1 | mysql | database | sql     |
|          2 | python | backend           |
|          3 | mysql | performance        |
+------------+----------------------------+
```

## Order the Concatenated Values

```sql
SELECT
  article_id,
  GROUP_CONCAT(tag ORDER BY tag ASC SEPARATOR ', ') AS tags_sorted
FROM article_tags
GROUP BY article_id;
```

## Remove Duplicates with DISTINCT

```sql
INSERT INTO article_tags VALUES (1, 'mysql');  -- duplicate

SELECT
  article_id,
  GROUP_CONCAT(DISTINCT tag ORDER BY tag SEPARATOR ', ') AS unique_tags
FROM article_tags
GROUP BY article_id;
```

## Join with Another Table

Combine GROUP_CONCAT with JOIN to show related data:

```sql
SELECT
  a.title,
  GROUP_CONCAT(t.tag ORDER BY t.tag SEPARATOR ', ') AS tags
FROM articles a
JOIN article_tags t ON t.article_id = a.id
GROUP BY a.id, a.title;
```

## Handling the Length Limit

`GROUP_CONCAT()` results are truncated at `group_concat_max_len` bytes (default 1024):

```sql
SHOW VARIABLES LIKE 'group_concat_max_len';
```

If your concatenated string could exceed this, increase it:

```sql
-- Session-level (recommended to avoid global impact)
SET SESSION group_concat_max_len = 1000000;

-- Or in my.cnf for a permanent change
-- group_concat_max_len = 1000000
```

Check if truncation occurred:

```sql
SELECT
  article_id,
  GROUP_CONCAT(content) AS merged_content,
  LENGTH(GROUP_CONCAT(content)) AS result_length
FROM long_content_table
GROUP BY article_id;

-- Compare result_length against @@group_concat_max_len
```

## Convert GROUP_CONCAT to a List for IN Clause

A common but problematic pattern is using GROUP_CONCAT with IN:

```sql
-- This does NOT work as expected
SELECT *
FROM products
WHERE id IN (
  SELECT GROUP_CONCAT(product_id) FROM cart WHERE user_id = 1
);
```

GROUP_CONCAT returns a string like `'1,2,3'` which is not the same as `IN (1,2,3)`. Use a regular subquery instead:

```sql
-- Correct approach
SELECT *
FROM products
WHERE id IN (
  SELECT product_id FROM cart WHERE user_id = 1
);
```

## Build JSON Arrays Using GROUP_CONCAT

For a portable JSON array string (without JSON functions):

```sql
SELECT
  article_id,
  CONCAT('[', GROUP_CONCAT(CONCAT('"', tag, '"') ORDER BY tag SEPARATOR ','), ']') AS tags_json
FROM article_tags
GROUP BY article_id;
```

Or use the native JSON function in MySQL 8.0:

```sql
SELECT
  article_id,
  JSON_ARRAYAGG(tag) AS tags_json
FROM article_tags
GROUP BY article_id;
```

## GROUP_CONCAT for Dynamic PIVOT

```sql
-- Build a dynamic PIVOT query
SELECT
  CONCAT('SELECT user_id, ',
    GROUP_CONCAT(
      CONCAT('SUM(CASE WHEN product_id = ', product_id, ' THEN quantity ELSE 0 END) AS product_', product_id)
      SEPARATOR ', '
    ),
    ' FROM orders GROUP BY user_id'
  ) AS pivot_query
FROM (SELECT DISTINCT product_id FROM orders) p;
```

Then use `PREPARE` and `EXECUTE` to run the generated query.

## Summary

`GROUP_CONCAT()` is MySQL's primary string aggregation function, useful for flattening one-to-many relationships into a single field for display, JSON building, or pivot generation. Always adjust `group_concat_max_len` when working with large datasets and use `DISTINCT` to eliminate duplicates. In MySQL 8.0, `JSON_ARRAYAGG()` is a cleaner alternative when building JSON output.

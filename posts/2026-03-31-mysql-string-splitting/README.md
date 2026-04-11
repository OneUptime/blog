# How to Use String Splitting in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, String, Function

Description: Learn how to split delimited strings in MySQL using SUBSTRING_INDEX, JSON_TABLE, and recursive CTEs to extract individual elements from CSV-like column values.

---

Storing delimited values in a single column violates first normal form, but legacy schemas often contain comma-separated lists, tags, or codes in a single field. MySQL provides several techniques to split these strings into individual rows or values for querying and processing.

## SUBSTRING_INDEX for Fixed-Position Extraction

`SUBSTRING_INDEX(str, delim, count)` returns the substring before the nth occurrence of a delimiter. Use it to extract specific positions:

```sql
-- Extract the first element
SELECT SUBSTRING_INDEX('apple,banana,cherry', ',', 1);  -- apple

-- Extract the second element
SELECT SUBSTRING_INDEX(
  SUBSTRING_INDEX('apple,banana,cherry', ',', 2),
  ',', -1
);  -- banana

-- Extract the last element
SELECT SUBSTRING_INDEX('apple,banana,cherry', ',', -1);  -- cherry
```

The nested call technique extracts any position: first take the leftmost N parts, then take the last one.

## Splitting a Column Value

Apply the same logic to a table column:

```sql
SELECT
  id,
  SUBSTRING_INDEX(tags, ',', 1)  AS tag1,
  SUBSTRING_INDEX(SUBSTRING_INDEX(tags, ',', 2), ',', -1) AS tag2,
  SUBSTRING_INDEX(SUBSTRING_INDEX(tags, ',', 3), ',', -1) AS tag3
FROM articles;
```

This works for known, fixed numbers of elements.

## Splitting to Rows with JSON_TABLE (MySQL 8.0+)

`JSON_TABLE` provides a clean way to convert delimited strings to rows without a numbers helper table:

```sql
SELECT
  a.id,
  j.tag
FROM articles a
JOIN JSON_TABLE(
  CONCAT('["', REPLACE(a.tags, ',', '","'), '"]'),
  '$[*]' COLUMNS (tag VARCHAR(100) PATH '$')
) j;
```

The trick converts the CSV string into a JSON array by replacing commas with `","` and wrapping it in `["..."]`, then uses `JSON_TABLE` to expand it.

## Using a Numbers Table

A numbers table generates row offsets for each position in the delimited string:

```sql
-- Create a helper numbers table
CREATE TABLE numbers (n INT PRIMARY KEY);
INSERT INTO numbers VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10);

-- Split CSV to rows
SELECT
  a.id,
  TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(a.tags, ',', n.n), ',', -1)) AS tag
FROM articles a
JOIN numbers n
  ON n.n <= 1 + LENGTH(a.tags) - LENGTH(REPLACE(a.tags, ',', ''))
ORDER BY a.id, n.n;
```

The `ON` condition limits the join to valid positions based on the actual number of delimiters.

## Recursive CTE Split (MySQL 8.0+)

For variable-length splits without a numbers table, use a recursive CTE:

```sql
WITH RECURSIVE split AS (
  SELECT
    id,
    CONCAT(tags, ',') AS remaining,
    '' AS token
  FROM articles

  UNION ALL

  SELECT
    id,
    SUBSTRING(remaining, LOCATE(',', remaining) + 1),
    TRIM(SUBSTRING_INDEX(remaining, ',', 1))
  FROM split
  WHERE remaining != ''
)
SELECT id, token
FROM split
WHERE token != ''
ORDER BY id;
```

## Counting Elements in a Delimited String

Count commas plus one to find the element count:

```sql
SELECT
  id,
  tags,
  1 + LENGTH(tags) - LENGTH(REPLACE(tags, ',', '')) AS tag_count
FROM articles;
```

## Best Practice

Splitting strings in SQL is always a workaround for poor schema design. If the data is regularly queried by individual element, normalize it into a separate table with one row per element. If the schema cannot change, the `JSON_TABLE` approach is the most readable for MySQL 8.0+.

## Summary

MySQL offers `SUBSTRING_INDEX` for fixed-position extraction, `JSON_TABLE` for clean row expansion in MySQL 8.0+, and recursive CTEs for variable-length splits. The best long-term solution is schema normalization, but these techniques handle legacy CSV columns effectively.

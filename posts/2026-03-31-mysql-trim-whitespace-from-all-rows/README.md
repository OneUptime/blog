# How to Trim Whitespace from All Rows in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Data Cleaning, String, Trim, Update

Description: Learn how to find and remove leading, trailing, and internal whitespace from all rows in MySQL using TRIM, LTRIM, RTRIM, and REGEXP_REPLACE.

---

## Why Whitespace Causes Problems

Whitespace in string columns causes silent query failures - a search for `'Alice'` will not match `' Alice '`. It also breaks joins, comparisons, and unique constraints. Cleaning whitespace is one of the most common data quality tasks.

## Finding Rows with Extra Whitespace

Identify rows where the trimmed value differs from the original:

```sql
SELECT id, name
FROM customers
WHERE name != TRIM(name);
```

For leading whitespace only:

```sql
SELECT id, name
FROM customers
WHERE name != LTRIM(name);
```

For trailing whitespace only:

```sql
SELECT id, name
FROM customers
WHERE name != RTRIM(name);
```

## Trimming All String Columns

Run an `UPDATE` to trim a specific column across all rows:

```sql
UPDATE customers
SET name = TRIM(name)
WHERE name != TRIM(name);
```

Trim multiple columns at once:

```sql
UPDATE customers
SET
  name       = TRIM(name),
  email      = TRIM(email),
  city       = TRIM(city),
  country    = TRIM(country)
WHERE
  name    != TRIM(name) OR
  email   != TRIM(email) OR
  city    != TRIM(city) OR
  country != TRIM(country);
```

## Removing Internal Extra Spaces

`TRIM` only removes leading and trailing whitespace. Use `REGEXP_REPLACE` (MySQL 8.0+) to collapse internal multiple spaces:

```sql
UPDATE customers
SET name = REGEXP_REPLACE(name, '\\s+', ' ')
WHERE name REGEXP '\\s{2,}';
```

This replaces any sequence of two or more whitespace characters with a single space.

## Removing Non-Breaking Spaces

Non-breaking spaces (Unicode 0xA0) are not removed by `TRIM`. Use `REPLACE` combined with `TRIM`:

```sql
UPDATE customers
SET name = TRIM(REPLACE(name, CHAR(160), ' '))
WHERE name LIKE CONCAT('%', CHAR(160), '%');
```

## Trimming Tab and Newline Characters

To remove tabs (`\t`) and newlines (`\n`, `\r`) from string fields:

```sql
UPDATE customers
SET name = REGEXP_REPLACE(name, '[\\t\\n\\r]+', '')
WHERE name REGEXP '[\\t\\n\\r]';
```

## Auditing Before and After

Wrap updates in a transaction and review the impact first:

```sql
START TRANSACTION;

UPDATE customers
SET name = TRIM(name)
WHERE name != TRIM(name);

SELECT ROW_COUNT() AS rows_affected;

-- Review a sample
SELECT id, name FROM customers LIMIT 20;

-- Commit when satisfied
COMMIT;
-- Or rollback:
-- ROLLBACK;
```

## Preventing Whitespace on Insert

Add a trigger to auto-trim on insert and update:

```sql
DELIMITER $$
CREATE TRIGGER before_customer_insert
BEFORE INSERT ON customers
FOR EACH ROW
BEGIN
  SET NEW.name  = TRIM(NEW.name);
  SET NEW.email = TRIM(NEW.email);
END$$
DELIMITER ;
```

## Summary

Use `TRIM()`, `LTRIM()`, and `RTRIM()` for leading and trailing whitespace, and `REGEXP_REPLACE` for internal extra spaces. Run targeted `UPDATE` statements scoped to affected rows only. Prevent future whitespace issues with `BEFORE INSERT` and `BEFORE UPDATE` triggers.

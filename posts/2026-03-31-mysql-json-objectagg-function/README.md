# How to Use JSON_OBJECTAGG() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, JSON, Aggregate Function

Description: Learn how to use MySQL's JSON_OBJECTAGG() aggregate function to build JSON objects from grouped key-value row pairs in a single query.

---

## What Is JSON_OBJECTAGG()?

`JSON_OBJECTAGG()` is an aggregate function introduced in MySQL 5.7.22 that collects rows into a single JSON object using one column as the key and another as the value. It is the object counterpart to `JSON_ARRAYAGG()`.

Syntax:

```sql
JSON_OBJECTAGG(key_expr, value_expr)
```

Keys must be strings (or implicitly castable to strings). If any key is `NULL`, MySQL raises an error.

## Basic Usage

```sql
CREATE TABLE config (
  setting_name VARCHAR(50),
  setting_value VARCHAR(200)
);

INSERT INTO config VALUES
('max_connections', '100'),
('timeout', '30'),
('debug_mode', 'false');

SELECT JSON_OBJECTAGG(setting_name, setting_value) AS settings
FROM config;
```

Result:

```json
{"debug_mode": "false", "max_connections": "100", "timeout": "30"}
```

This is ideal for converting key-value tables into a single JSON document.

## Grouping by a Parent Entity

Aggregate settings per environment:

```sql
SELECT
  environment,
  JSON_OBJECTAGG(setting_key, setting_value) AS config
FROM app_config
GROUP BY environment;
```

Each row in the result contains a JSON object with all key-value pairs for that environment.

## Pivoting Data with JSON_OBJECTAGG()

Transform a row-per-attribute table into a wide JSON document:

```sql
SELECT
  user_id,
  JSON_OBJECTAGG(attribute_name, attribute_value) AS attributes
FROM user_attributes
GROUP BY user_id;
```

This is a dynamic pivot - useful when the number of attributes is not known at query time.

## Combining with JSON_ARRAYAGG()

Build a structure where each group produces an object and multiple groups produce an array:

```sql
SELECT JSON_ARRAYAGG(dept_json) AS departments
FROM (
  SELECT JSON_OBJECTAGG(role, COUNT(*)) AS dept_json
  FROM employees
  GROUP BY department_id
) sub;
```

## Handling Duplicate Keys

If the same key appears multiple times in a group, the behavior is undefined - MySQL may use any of the values. Avoid duplicate keys by deduplicating in a subquery first:

```sql
SELECT
  user_id,
  JSON_OBJECTAGG(setting_key, setting_value) AS settings
FROM (
  SELECT DISTINCT user_id, setting_key, setting_value
  FROM user_settings
) deduped
GROUP BY user_id;
```

## NULL Key Error

```sql
SELECT JSON_OBJECTAGG(NULL, 'value');
-- ERROR 3158 (22032): JSON documents may not contain NULL member names.
```

Guard against nulls with `COALESCE`:

```sql
SELECT JSON_OBJECTAGG(COALESCE(key_col, 'unknown'), val_col)
FROM some_table;
```

## Practical Example: Product Variant Pricing

Store per-size pricing as a JSON object:

```sql
SELECT
  product_id,
  JSON_OBJECTAGG(size_code, price) AS prices_by_size
FROM product_variants
GROUP BY product_id;
```

Result:

```json
{"S": 19.99, "M": 21.99, "L": 23.99, "XL": 25.99}
```

This object can be stored in a JSON column or returned directly to an API.

## Summary

`JSON_OBJECTAGG()` converts key-value row pairs into a single JSON object per group. It is especially useful for dynamic pivoting, flattening configuration tables, and building structured API payloads without post-processing in application code.

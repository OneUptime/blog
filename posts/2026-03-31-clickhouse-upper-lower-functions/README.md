# How to Use upper() and lower() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, SQL, UTF-8, Case Conversion

Description: upper() converts strings to uppercase and lower() to lowercase. upperUTF8() and lowerUTF8() handle multi-byte characters. Learn to normalize data for case-insensitive comparisons.

---

Case normalization is one of the most common preprocessing steps in data pipelines. User-supplied strings arrive in inconsistent casing: some all-caps, some mixed, some lowercase. ClickHouse provides `upper()` and `lower()` for byte-level case conversion (reliable for ASCII), and `upperUTF8()` and `lowerUTF8()` for proper Unicode-aware conversion when dealing with international text.

## upper() and lower() Basics

`upper(str)` converts every ASCII lowercase letter (a-z) to its uppercase equivalent. `lower(str)` does the reverse. Neither function modifies bytes outside the ASCII range, which means they work incorrectly on accented characters or non-Latin scripts.

```sql
SELECT
    upper('hello world')      AS uppercased,
    lower('HELLO WORLD')      AS lowercased,
    lower('MiXeD CaSe StRiNg') AS normalized;
```

```text
uppercased   | lowercased   | normalized
-------------+--------------+--------------
HELLO WORLD  | hello world  | mixed case string
```

## upperUTF8() and lowerUTF8() for International Text

For strings that may contain characters outside ASCII, use the UTF8 variants. They correctly handle accented Latin letters, Cyrillic, Greek, and other Unicode scripts.

```sql
SELECT
    str,
    upper(str)      AS ascii_upper,
    upperUTF8(str)  AS utf8_upper,
    lower(str)      AS ascii_lower,
    lowerUTF8(str)  AS utf8_lower
FROM (
    SELECT 'hello'      AS str UNION ALL
    SELECT 'café'       AS str UNION ALL
    SELECT 'münchen'    AS str UNION ALL
    SELECT 'привет'     AS str UNION ALL
    SELECT 'istanbul'   AS str
);
```

```text
str       | ascii_upper | utf8_upper | ascii_lower | utf8_lower
----------+-------------+------------+-------------+-----------
hello     | HELLO       | HELLO      | hello       | hello
café      | CAFé        | CAFÉ       | café        | café
münchen   | MüNCHEN     | MÜNCHEN    | münchen     | münchen
привет    | привет      | ПРИВЕТ     | привет      | привет
istanbul  | ISTANBUL    | ISTANBUL   | istanbul    | istanbul
```

`upper('café')` leaves the é unchanged because é is not an ASCII character. `upperUTF8('café')` correctly produces CAFÉ.

## Normalizing Data for Case-Insensitive Comparison

When comparing strings from different sources that may differ only in casing, normalize both sides to the same case before comparing.

```sql
CREATE TABLE customer_tags
(
    customer_id UInt32,
    tag         String
)
ENGINE = MergeTree()
ORDER BY customer_id;

INSERT INTO customer_tags VALUES
    (1, 'VIP'),
    (2, 'vip'),
    (3, 'Vip'),
    (4, 'PREMIUM'),
    (5, 'premium'),
    (6, 'Premium');
```

Without normalization, these tags would not group together.

```sql
-- Without normalization: 6 distinct tags
SELECT tag, count() AS cnt
FROM customer_tags
GROUP BY tag
ORDER BY tag;
```

```sql
-- With normalization: 2 distinct tags
SELECT lower(tag) AS normalized_tag, count() AS cnt
FROM customer_tags
GROUP BY normalized_tag
ORDER BY normalized_tag;
```

The second query correctly groups all variants of "vip" and "premium" together.

## Case-Insensitive Search

Use `lower()` on both the column and the search term to perform a case-insensitive match without a case-insensitive collation.

```sql
CREATE TABLE products
(
    product_id   UInt32,
    product_name String
)
ENGINE = MergeTree()
ORDER BY product_id;

INSERT INTO products VALUES
    (1, 'Wireless Keyboard'),
    (2, 'USB-C Hub'),
    (3, 'WIRELESS MOUSE'),
    (4, 'Bluetooth Speaker'),
    (5, 'wireless headphones');
```

```sql
-- Find all products with 'wireless' in the name, regardless of case
SELECT product_id, product_name
FROM products
WHERE lower(product_name) LIKE '%wireless%'
ORDER BY product_id;
```

All three "wireless" products are returned regardless of how the name was originally stored.

## Normalizing Columns on Ingest with a Materialized Column

If you always query a column in lowercase, store it that way using a materialized column or normalize it on insert.

```sql
CREATE TABLE normalized_tags
(
    customer_id    UInt32,
    tag_original   String,
    tag_normalized String MATERIALIZED lowerUTF8(tag_original)
)
ENGINE = MergeTree()
ORDER BY customer_id;

INSERT INTO normalized_tags (customer_id, tag_original) VALUES
    (1, 'VIP'),
    (2, 'vip'),
    (3, 'Premium'),
    (4, 'PREMIUM');
```

```sql
SELECT customer_id, tag_original, tag_normalized
FROM normalized_tags
ORDER BY customer_id;
```

The `tag_normalized` column is automatically populated with the lowercase version. Queries can then filter on `tag_normalized` directly, allowing ClickHouse to use any index on that column efficiently.

## Building Case-Insensitive Lookup Keys

Combine `lower()` with `concat()` to build composite keys that are insensitive to case differences.

```sql
SELECT
    customer_id,
    lower(concat(first_name, '.', last_name)) AS lookup_key
FROM (
    SELECT 1 AS customer_id, 'Alice' AS first_name, 'Chen'   AS last_name UNION ALL
    SELECT 2 AS customer_id, 'ALICE' AS first_name, 'CHEN'   AS last_name UNION ALL
    SELECT 3 AS customer_id, 'Bob'   AS first_name, 'Nguyen' AS last_name
);
```

```text
customer_id | lookup_key
------------+-----------
1           | alice.chen
2           | alice.chen
3           | bob.nguyen
```

Customers 1 and 2, despite different raw casing, now produce the same lookup key and can be detected as duplicates.

## Uppercasing for Display and Reporting

Use `upper()` to format data for display when a style guide requires uppercase labels.

```sql
SELECT
    upper(department)  AS department_label,
    count()            AS headcount,
    round(avg(salary), 2) AS avg_salary
FROM (
    SELECT 'engineering' AS department, 95000 AS salary UNION ALL
    SELECT 'engineering' AS department, 105000 AS salary UNION ALL
    SELECT 'marketing'   AS department, 75000 AS salary UNION ALL
    SELECT 'marketing'   AS department, 80000 AS salary UNION ALL
    SELECT 'sales'       AS department, 70000 AS salary
)
GROUP BY department
ORDER BY department_label;
```

## Summary

`upper()` and `lower()` convert ASCII characters only and are fast for data that is guaranteed to be ASCII. `upperUTF8()` and `lowerUTF8()` are the correct choice for any text containing non-ASCII characters, handling accented letters and non-Latin scripts properly. The most common production use is normalizing both sides of a comparison to the same case to achieve case-insensitive matching, grouping, and deduplication. When a column is always queried in normalized form, a MATERIALIZED column avoids repeating the conversion at query time.

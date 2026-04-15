# How to Use trim(), ltrim(), and rtrim() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, SQL, Data Cleaning

Description: trim() removes leading and trailing characters, ltrim() removes from the left, rtrim() from the right. Learn to clean user input and normalize strings with custom character sets.

---

Raw data arriving from forms, files, or external APIs frequently carries unwanted whitespace or stray characters at the edges of strings. ClickHouse provides three functions for removing these: `trim()`, `ltrim()`, and `rtrim()`. By default they strip ASCII whitespace, but they also accept a custom set of characters to remove, making them suitable for sanitizing a wide range of real-world data quality issues.

## The Three Functions at a Glance

```text
trim([LEADING | TRAILING | BOTH] [characters FROM] str)
ltrim(str)          -- removes leading whitespace (equivalent to trim(LEADING FROM str))
rtrim(str)          -- removes trailing whitespace (equivalent to trim(TRAILING FROM str))
```

`ltrim()` and `rtrim()` are shorthand helpers. The full `trim()` syntax with LEADING/TRAILING/BOTH and an optional character set covers every case.

## Basic Whitespace Removal

The simplest use is stripping spaces from the edges of a string.

```sql
SELECT
    '  hello world  '                    AS raw,
    trim('  hello world  ')              AS trimmed_both,
    ltrim('  hello world  ')             AS trimmed_left,
    rtrim('  hello world  ')             AS trimmed_right;
```

```text
raw              | trimmed_both  | trimmed_left    | trimmed_right
-----------------+---------------+-----------------+-----------------
  hello world    | hello world   | hello world     |   hello world
```

`trim()` removes whitespace from both ends. `ltrim()` leaves the trailing spaces, and `rtrim()` leaves the leading spaces.

## Setting Up Sample Data

Create a table that mimics messy input data arriving from a form submission pipeline.

```sql
CREATE TABLE form_submissions
(
    submission_id UInt32,
    first_name    String,
    last_name     String,
    email         String,
    promo_code    String
)
ENGINE = MergeTree()
ORDER BY submission_id;

INSERT INTO form_submissions VALUES
    (1, '  Alice',    'Chen  ',   ' alice@example.com', '  SAVE10  '),
    (2, 'Bob ',       '  Nguyen', 'bob@example.com  ',  'DISCOUNT20'),
    (3, '   Claire ', 'Dubois',   'claire@example.com', '   VIP50'),
    (4, 'Dan',        'Okafor  ', '  dan@example.com ', '  '),
    (5, 'Eve',        'Green',    'eve@example.com',    'PROMO30  ');
```

## Cleaning Multiple Columns at Once

Apply `trim()` to every column that might carry whitespace.

```sql
SELECT
    submission_id,
    trim(first_name)  AS first_name,
    trim(last_name)   AS last_name,
    trim(email)       AS email,
    trim(promo_code)  AS promo_code
FROM form_submissions
ORDER BY submission_id;
```

After trimming, the values are clean and ready for downstream processing or storage in a normalized table.

## Filtering Out Blank Submissions After Trimming

A field that contains only spaces appears non-empty until trimmed. Combine `trim()` with `empty()` to catch these.

```sql
SELECT
    submission_id,
    promo_code,
    trim(promo_code)              AS trimmed_code,
    empty(trim(promo_code))       AS code_is_blank
FROM form_submissions
ORDER BY submission_id;
```

Submission 4 has `promo_code = '  '`, which is not empty until trimmed. After trimming, `empty()` correctly returns 1.

```sql
-- Return only submissions that have a real promo code
SELECT submission_id, trim(promo_code) AS promo_code
FROM form_submissions
WHERE notEmpty(trim(promo_code))
ORDER BY submission_id;
```

## Removing Custom Characters with trim()

The full trim() syntax allows specifying characters to remove instead of just whitespace. Place the character string directly after the LEADING, TRAILING, or BOTH keyword, followed by FROM.

```sql
SELECT
    trim(BOTH '/' FROM '/api/v2/users/')        AS path_trimmed,
    trim(LEADING '0' FROM '000123')             AS leading_zeros_removed,
    trim(BOTH '"' FROM '"quoted value"')        AS dequoted,
    trim(BOTH ' ,' FROM ' ,hello, ')            AS punct_trimmed;
```

```text
path_trimmed | leading_zeros_removed | dequoted     | punct_trimmed
-------------+-----------------------+--------------+--------------
api/v2/users | 123                   | quoted value | hello
```

The character list is treated as a set - each character in the set is independently removed from the specified edge. `trim(BOTH ' ,' FROM ' ,hello, ')` removes any leading or trailing space or comma, not the literal string " ,".

## Normalizing URL Paths

Strip slashes from URL path components for consistent routing or comparison.

```sql
CREATE TABLE api_logs
(
    log_id   UInt64,
    path     String,
    status   UInt16
)
ENGINE = MergeTree()
ORDER BY log_id;

INSERT INTO api_logs VALUES
    (1, '/api/v2/users/',   200),
    (2, 'api/v2/orders',    200),
    (3, '/api/v2/products', 404),
    (4, 'api/v2/cart/',     200);
```

```sql
SELECT
    log_id,
    path,
    trim(BOTH '/' FROM path) AS normalized_path,
    status
FROM api_logs
ORDER BY log_id;
```

All paths now consistently lack leading and trailing slashes, making grouping and comparison reliable regardless of how the client sent the request.

## Removing Quotes from CSV-Parsed Data

Data imported from CSV files sometimes retains surrounding quotation marks.

```sql
SELECT
    raw_value,
    trim(BOTH '"' FROM raw_value)  AS unquoted
FROM (
    SELECT '"San Francisco"'  AS raw_value UNION ALL
    SELECT '"New York"'       AS raw_value UNION ALL
    SELECT 'Chicago'          AS raw_value UNION ALL
    SELECT '"Los Angeles"'    AS raw_value
);
```

`trim()` only removes the specified characters from the edges. "Chicago" is left unchanged because it has no surrounding quotes.

## Using ltrim() and rtrim() Separately

Sometimes you only need to clean one side. ltrim() is useful when data has consistent leading symbols (like currency or bullet markers); rtrim() handles trailing punctuation.

```sql
SELECT
    raw_price,
    ltrim(raw_price, '$')               AS price_no_symbol,
    toFloat64(ltrim(raw_price, '$ '))   AS numeric_price
FROM (
    SELECT '$ 19.99' AS raw_price UNION ALL
    SELECT '$5.00'   AS raw_price UNION ALL
    SELECT '$129.95' AS raw_price
);
```

Note: `ltrim(str, chars)` in ClickHouse accepts the characters to strip as a second positional argument rather than using the full LEADING syntax. Check your ClickHouse version for the exact supported form; the LEADING/TRAILING/BOTH syntax is the most portable.

## Summary

`trim()`, `ltrim()`, and `rtrim()` clean string edges by removing whitespace or custom character sets. The default behavior strips ASCII whitespace, which covers the majority of user-input cleaning tasks. The full trim() syntax with LEADING, TRAILING, or BOTH plus a custom character string handles more specific normalization needs like stripping slashes from paths, quotes from CSV values, or leading zeros from code strings. Pair `trim()` with `empty()` or `notEmpty()` to correctly detect and filter fields that contain only whitespace after cleaning.

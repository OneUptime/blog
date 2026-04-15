# How to Use substring() and substringUTF8() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, SQL, UTF-8, Substring

Description: substring(str, offset, length) extracts a portion of a string by byte position. substringUTF8() counts by Unicode code points for multi-byte text. Includes practical examples.

---

Extracting portions of a string is a routine operation in data transformation pipelines. ClickHouse provides `substring()` for byte-based extraction and `substringUTF8()` for character-based extraction from UTF-8 encoded strings. Knowing which to use, and how the offset and length arguments behave, avoids subtle bugs when processing internationalized text.

## Function Signatures

```text
substring(str, offset)
substring(str, offset, length)

substringUTF8(str, offset)
substringUTF8(str, offset, length)
```

- `offset` is 1-based. The first byte (or character for UTF8) is at position 1.
- Negative `offset` counts backward from the end of the string.
- If `length` is omitted, the function returns everything from `offset` to the end.
- If `offset + length` exceeds the string length, the result is truncated at the string's end without an error.

## Basic substring() Examples

```sql
SELECT
    substring('Hello, World!', 1, 5)  AS first_five,
    substring('Hello, World!', 8)     AS from_position_8,
    substring('Hello, World!', -6)    AS last_six_chars;
```

```text
first_five | from_position_8 | last_six_chars
-----------+-----------------+---------------
Hello      | World!          | World!
```

Negative offset `-6` on a 13-character string starts at position 8 (which is 'W'), returning everything from there to the end — the same as `substring('Hello, World!', 8)`.

## Extracting Domain Names from URLs

A practical use case is pulling components out of URL strings stored in a column.

```sql
CREATE TABLE page_views
(
    view_id   UInt64,
    url       String,
    user_id   UInt32
)
ENGINE = MergeTree()
ORDER BY view_id;

INSERT INTO page_views VALUES
    (1, 'https://shop.example.com/products/123',   101),
    (2, 'https://shop.example.com/cart',           101),
    (3, 'https://blog.example.com/post/how-to-sql', 102),
    (4, 'https://api.example.com/v2/orders/456',   103);
```

Extract everything after "https://" to remove the protocol prefix.

```sql
SELECT
    url,
    substring(url, 9) AS without_protocol
FROM page_views
ORDER BY view_id;
```

To extract just the subdomain and domain (up to the first path slash after the host), combine `substring()` with `position()`.

```sql
SELECT
    url,
    substring(url, 9, position(url, '/', 9) - 9) AS host
FROM page_views
ORDER BY view_id;
```

`position(url, '/', 9)` returns the index of the first '/' at or after position 9 (skipping the two slashes in "https://"). Subtracting 9 gives the length of the host portion.

## Extracting Prefixes from Product Codes

Product or order codes often embed a category prefix in a fixed position.

```sql
CREATE TABLE products
(
    product_code String,
    product_name String,
    price        Float64
)
ENGINE = MergeTree()
ORDER BY product_code;

INSERT INTO products VALUES
    ('ELEC-00142', 'Wireless Headphones',   89.99),
    ('BOOK-00891', 'SQL Performance Tuning', 34.99),
    ('ELEC-00773', 'USB-C Hub',              29.99),
    ('CLTH-00215', 'Merino Wool Sweater',    79.99),
    ('BOOK-01042', 'Database Internals',     44.99);
```

Extract the 4-character category prefix from each code.

```sql
SELECT
    product_code,
    substring(product_code, 1, 4) AS category_prefix,
    product_name,
    price
FROM products
ORDER BY category_prefix, product_code;
```

Extract the numeric portion (starting after the hyphen at position 6).

```sql
SELECT
    product_code,
    substring(product_code, 6) AS product_id_part,
    toUInt32(substring(product_code, 6)) AS product_id_number
FROM products
ORDER BY product_code;
```

## Extracting Date Parts from Formatted Strings

If dates are stored as formatted strings rather than Date columns, `substring()` lets you extract year, month, and day components by position.

```sql
SELECT
    formatted_date,
    substring(formatted_date, 1, 4)  AS year_part,
    substring(formatted_date, 6, 2)  AS month_part,
    substring(formatted_date, 9, 2)  AS day_part
FROM (
    SELECT '2024-03-15' AS formatted_date UNION ALL
    SELECT '2023-11-07' AS formatted_date UNION ALL
    SELECT '2024-01-31' AS formatted_date
);
```

## substringUTF8() for Multi-Byte Characters

When the string contains multi-byte UTF-8 characters, `substring()` counts bytes which can split characters and produce garbled text. `substringUTF8()` counts full Unicode code points instead.

```sql
SELECT
    str,
    substring(str, 1, 3)    AS bytes_1_to_3,
    substringUTF8(str, 1, 3) AS chars_1_to_3
FROM (
    SELECT 'hello'      AS str UNION ALL
    SELECT 'données'    AS str UNION ALL
    SELECT '数据库'       AS str UNION ALL
    SELECT 'Привет'     AS str
);
```

For "données", `substring(str, 1, 3)` returns "don" (3 bytes). `substringUTF8(str, 1, 3)` returns "don" too in this case because the first 3 characters are ASCII. But `substringUTF8(str, 1, 5)` returns "donné" (5 characters), while `substring(str, 1, 5)` returns only 5 bytes — the four ASCII characters "donn" plus the first byte of the two-byte 'é' — producing garbled output.

```sql
SELECT
    'données'                         AS str,
    substringUTF8('données', 1, 5)    AS first_5_chars,
    lengthUTF8('données')             AS total_chars,
    length('données')                 AS total_bytes;
```

## Truncating Strings to a Character Limit

Use `substringUTF8()` to safely truncate user-supplied text to a maximum display length.

```sql
SELECT
    description,
    substringUTF8(description, 1, 50) AS truncated_50_chars,
    lengthUTF8(description) > 50       AS was_truncated
FROM (
    SELECT 'Short text'   AS description UNION ALL
    SELECT 'This is a longer piece of text that definitely exceeds our fifty character display limit for this field' AS description UNION ALL
    SELECT 'データベース管理システムは大規模なデータを効率的に処理します。' AS description
);
```

## Summary

`substring()` extracts slices of a string using byte offsets. It is fast and correct for ASCII-only data. `substringUTF8()` counts Unicode code points and is the right choice for any text that may contain non-ASCII characters such as accented letters, Cyrillic, Chinese, or emoji. Both functions use 1-based indexing, accept negative offsets to count from the end, and silently truncate rather than erroring when the requested range exceeds the string length. Common patterns include stripping URL protocols, extracting fixed-position prefixes from structured codes, and pulling date components from formatted strings.

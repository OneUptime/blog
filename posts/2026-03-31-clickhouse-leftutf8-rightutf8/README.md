# How to Use leftUTF8() and rightUTF8() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Unicode, SQL

Description: Learn how leftUTF8() and rightUTF8() correctly extract characters from Unicode strings in ClickHouse, avoiding the byte-truncation bugs of left() and right().

---

ClickHouse's `left(str, n)` and `right(str, n)` functions return the first or last `n` bytes of a string. For pure ASCII data this is equivalent to `n` characters, but for UTF-8 strings containing multi-byte characters (accented letters, CJK, emoji, Cyrillic, Arabic, etc.) byte offsets and character offsets diverge. Slicing by bytes can cut a multi-byte character in half, producing garbled output or invalid UTF-8. `leftUTF8()` and `rightUTF8()` count Unicode code points instead of bytes, making them the correct choice for any internationalized data.

## How Byte-Based left() Can Go Wrong

A single UTF-8 character can occupy 1 to 4 bytes. When `left()` slices on byte boundaries, it may stop in the middle of a character.

```sql
-- "Привет" is 6 Cyrillic characters, each 2 bytes (12 bytes total)
-- Taking 3 bytes cuts through the second Cyrillic character
SELECT
    left('Привет', 3)     AS byte_slice,   -- 3 bytes: cuts mid-character
    leftUTF8('Привет', 3) AS char_slice;   -- correctly returns first 3 characters
```

```text
byte_slice | char_slice
-----------|----------
П�         | При
```

`byte_slice` contains 3 raw bytes — the complete 2-byte character П plus the leading byte of р — producing an invalid UTF-8 sequence that displays as a replacement character.

```sql
-- Taking 5 bytes cuts through the third Cyrillic character
SELECT
    left('Привет', 5)     AS broken_slice,
    leftUTF8('Привет', 3) AS correct_3_chars;
```

```text
broken_slice | correct_3_chars
-------------|----------------
Пр�          | При
```

`broken_slice` contains 5 bytes — two complete Cyrillic characters Пр (4 bytes) plus the leading byte of и — ending with a partial byte sequence that displays as a replacement character.

## Basic Usage of leftUTF8() and rightUTF8()

```text
leftUTF8(str, n)   -- Returns the first n Unicode characters of str
rightUTF8(str, n)  -- Returns the last n Unicode characters of str
```

```sql
-- Extract first and last 5 characters from a mixed-script string
SELECT
    leftUTF8('Hello Мир 世界', 5)   AS first_5_chars,
    rightUTF8('Hello Мир 世界', 2)  AS last_2_chars;
```

```text
first_5_chars | last_2_chars
--------------|-------------
Hello         | 世界
```

## Truncating Display Strings

A common UI requirement is truncating strings to a maximum display length (measured in characters, not bytes) and appending an ellipsis.

```sql
-- Truncate article titles to 50 characters for preview display
SELECT
    title,
    if(
        lengthUTF8(title) > 50,
        concat(leftUTF8(title, 47), '...'),
        title
    ) AS truncated_title
FROM articles
LIMIT 10;
```

```sql
-- Apply the same to multi-language product names
SELECT
    product_id,
    product_name,
    concat(leftUTF8(product_name, 20), '...') AS short_name
FROM products
WHERE lengthUTF8(product_name) > 20
LIMIT 10;
```

## Extracting Prefixes for Bucketing

Taking the first character or first few characters of a Unicode string is a common technique for grouping or partitioning data alphabetically.

```sql
-- Group users by the first character of their display name
SELECT
    leftUTF8(display_name, 1) AS name_initial,
    count()                   AS user_count
FROM users
GROUP BY name_initial
ORDER BY user_count DESC
LIMIT 30;
```

## Extracting Suffixes with rightUTF8()

`rightUTF8()` returns the last `n` Unicode characters. Use it to extract file extensions, domain suffixes, or trailing tokens from structured fields.

```sql
-- Extract the last 4 characters (typical extension with dot) from filenames
SELECT
    file_name,
    rightUTF8(file_name, 4) AS extension_hint
FROM file_uploads
WHERE lengthUTF8(file_name) >= 4
LIMIT 10;
```

```sql
-- Validate that strings end with a specific Unicode suffix
SELECT
    count()
FROM products
WHERE rightUTF8(product_code, 2) NOT IN ('US', 'EU', 'JP', 'CN');
```

## Comparing left() vs leftUTF8() Performance

`left()` is marginally faster because it does not need to scan for multi-byte character boundaries. For ASCII-only columns, `left()` is appropriate and avoids unnecessary overhead.

```sql
-- For pure ASCII columns, left() is equivalent and faster
SELECT left(ip_address, 7) AS ip_prefix FROM connections LIMIT 5;

-- For Unicode columns, always use leftUTF8()
SELECT leftUTF8(user_bio, 100) AS bio_preview FROM user_profiles LIMIT 5;
```

As a general rule: if you control the data and know it is ASCII-only, use `left()` and `right()`. For any user-generated content, internationalized text, or data from external systems, use `leftUTF8()` and `rightUTF8()`.

## Combining with substringUTF8()

For cases where you need characters from the middle of a string (not just the left or right), use `substringUTF8(str, offset, length)`.

```sql
-- Extract characters 3 through 7 (positions 3 to 7 inclusive)
SELECT substringUTF8('Hello Мир 世界', 3, 5) AS middle_chars;
```

```text
middle_chars
------------
llo М
```

`leftUTF8(str, n)` is equivalent to `substringUTF8(str, 1, n)`, and `rightUTF8(str, n)` is equivalent to `substringUTF8(str, lengthUTF8(str) - n + 1, n)`.

## Summary

`leftUTF8()` and `rightUTF8()` are the Unicode-safe alternatives to `left()` and `right()` in ClickHouse. They count Unicode code points rather than bytes, preventing garbled output when multi-byte characters are present. Use them for any user-facing truncation, alphabetical bucketing, suffix extraction, or character-accurate slicing on internationalized data. Reserve the byte-based `left()` and `right()` for known-ASCII columns where the performance difference matters.

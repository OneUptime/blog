# How to Use INSERT() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Database

Description: Learn how INSERT() replaces a substring at a specified position in MySQL, with examples for masking sensitive data, overwriting fixed-width fields, and injecting delimiters.

---

`INSERT(str, pos, len, newstr)` returns `str` with the substring starting at position `pos` and of length `len` replaced by `newstr`. It is a precise positional replacement function.

Note: this is the MySQL string function `INSERT()`, not the SQL `INSERT INTO` statement.

## Syntax

```sql
INSERT(str, pos, len, newstr)
```

- `str` - the original string.
- `pos` - the character position to start the replacement (1-indexed). If `pos` is not within the length of the string (`pos < 1` or `pos > CHAR_LENGTH(str)`), the result is `str` unchanged.
- `len` - number of characters to remove from `str` starting at `pos`.
- `newstr` - the string to insert in place of the removed characters.
- Returns `NULL` if any argument is `NULL`.

## Basic usage

```sql
SELECT INSERT('Hello World', 7, 5, 'MySQL');
-- 'Hello MySQL'  (replaces 5 chars starting at position 7)

SELECT INSERT('ABCDEFGH', 3, 2, 'XY');
-- 'ABXYEFGH'  (positions 3-4 'CD' replaced by 'XY')

-- len=0: insert without removing (pure insertion)
SELECT INSERT('ABCDEFGH', 3, 0, 'XY');
-- 'ABXYCDEFGH'

-- len > remaining chars: replaces from pos to end
SELECT INSERT('ABCDE', 3, 100, 'XY');
-- 'ABXY'
```

## Masking a credit card number

```sql
CREATE TABLE payments (
    payment_id  INT PRIMARY KEY,
    card_number CHAR(16)
);

INSERT INTO payments VALUES (1, '4111111111111234');

SELECT
    payment_id,
    INSERT(card_number, 1, 12, '************') AS masked_card
FROM payments;
-- '************1234'
```

## Masking an email address

```sql
SELECT
    email,
    INSERT(email, 2, LOCATE('@', email) - 2, REPEAT('*', LOCATE('@', email) - 2)) AS masked_email
FROM users;
-- 'alice@example.com' -> 'a****@example.com'
```

## Replacing a fixed-width field in a formatted string

```sql
-- Log record format: 'YYYY-MM-DD STATUS MESSAGE'
-- Replace the STATUS field (positions 12-18) with a new value
SELECT INSERT('2026-03-31 PENDING Order received', 12, 7, 'SHIPPED') AS updated_log;
-- '2026-03-31 SHIPPED Order received'
```

## Inserting a delimiter into a string

```sql
-- Format a 10-digit phone number: '5551234567' -> '555-123-4567'
SELECT
    INSERT(
        INSERT('5551234567', 4, 0, '-'),  -- insert '-' at position 4
        8, 0, '-'                          -- insert '-' at position 8
    ) AS formatted_phone;
-- '555-123-4567'
```

## Overwriting part of a serial number

```sql
CREATE TABLE devices (
    device_id    INT PRIMARY KEY,
    serial       CHAR(12)  -- format: 'YYMMDD-XXXXX'
);

INSERT INTO devices VALUES (1, '260331-00001');

-- Update the date portion to a new date
SELECT INSERT(serial, 1, 6, '260401') AS new_serial FROM devices;
-- '260401-00001'
```

## Comparison with REPLACE and SUBSTRING

```sql
-- INSERT: positional, replaces at exact location
SELECT INSERT('Hello World', 7, 5, 'MySQL');  -- 'Hello MySQL'

-- REPLACE: replaces all occurrences of a literal substring (not positional)
SELECT REPLACE('Hello World', 'World', 'MySQL');  -- 'Hello MySQL'

-- SUBSTRING: extracts, does not replace
SELECT SUBSTRING('Hello World', 7, 5);  -- 'World'
```

Use `INSERT()` when you know the exact position. Use `REPLACE()` when searching for a literal value.

## Edge cases

```sql
-- pos beyond end: str unchanged
SELECT INSERT('Hello', 100, 1, '!');  -- 'Hello'

-- pos = 0 or negative: str unchanged
SELECT INSERT('Hello', 0, 3, 'Hi');   -- 'Hello'
SELECT INSERT('Hello', -1, 3, 'Hi');  -- 'Hello'

-- len = 0: pure insertion at pos
SELECT INSERT('Hello', 3, 0, 'XY');   -- 'HeXYllo'

-- len > remaining chars: replace from pos to end
SELECT INSERT('Hello', 3, 100, 'XY'); -- 'HeXY'
```

## Summary

`INSERT(str, pos, len, newstr)` is a positional string replacement function. It removes `len` characters starting at `pos` and inserts `newstr` in their place. It is the right choice when you know the exact character position of the text to replace, such as masking credit cards, updating fixed-width log fields, and injecting delimiters into formatted strings. Use `REPLACE()` when you want to match a literal value regardless of position.

# How to Use LPAD() and RPAD() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Database

Description: Learn how LPAD() and RPAD() pad strings to a specified length in MySQL, how to use them for zero-padding numbers, fixed-width formatting, and alignment in reports.

---

`LPAD(str, len, padstr)` pads `str` on the left side with `padstr` until the total length is `len`. `RPAD(str, len, padstr)` pads on the right side. Both also truncate `str` if it is longer than `len`.

## Syntax

```sql
LPAD(str, len, padstr)
RPAD(str, len, padstr)
```

- `str` - the source string (or number, which is converted to string automatically).
- `len` - the desired total length of the result in characters.
- `padstr` - the string used for padding. Repeated as many times as needed to reach `len`.
- If `len` is shorter than the current length of `str`, the result is truncated to `len` characters.
- Returns `NULL` if any argument is `NULL`.

## Basic usage

```sql
SELECT LPAD('42', 6, '0');       -- '000042'
SELECT LPAD('Hello', 10, ' ');   -- '     Hello'
SELECT RPAD('Hello', 10, ' ');   -- 'Hello     '
SELECT RPAD('Hi', 8, '-');       -- 'Hi------'

-- Truncation when len < length of str
SELECT LPAD('Hello World', 5, ' ');  -- 'Hello'
SELECT RPAD('Hello World', 5, ' ');  -- 'Hello'
```

## Zero-padding numbers

```sql
SELECT LPAD(invoice_id, 8, '0') AS invoice_number
FROM invoices;
-- 42 -> '00000042'
-- 1234 -> '00001234'
```

## Generating fixed-width codes

```sql
CREATE TABLE products (
    product_id INT PRIMARY KEY,
    name       VARCHAR(100)
);

INSERT INTO products VALUES (1,'Widget'),(99,'Gadget'),(1000,'Doohickey');

SELECT
    name,
    CONCAT('PROD-', LPAD(product_id, 5, '0')) AS product_code
FROM products;
```

Result:

| name | product_code |
|---|---|
| Widget | PROD-00001 |
| Gadget | PROD-00099 |
| Doohickey | PROD-01000 |

## Right-aligning numbers in a report

```sql
SELECT
    name,
    LPAD(FORMAT(salary, 2), 12, ' ') AS salary_col
FROM employees
ORDER BY salary DESC;
```

`FORMAT(salary, 2)` formats to 2 decimal places with commas; `LPAD` right-aligns within a 12-character field.

## Left-aligning labels

```sql
SELECT
    RPAD(name, 30, ' ') AS label,
    salary
FROM employees;
```

## Using a multi-character pad string

`padstr` does not have to be a single character. MySQL repeats and trims it to fill the required length:

```sql
SELECT LPAD('end', 12, 'ab');   -- 'ababababaend'
SELECT RPAD('start', 12, 'xy'); -- 'startxyxyxyx'
```

## Combining LPAD and RPAD for centering

```sql
SET @text  = 'MySQL';
SET @width = 20;
SET @left  = FLOOR((@width - CHAR_LENGTH(@text)) / 2);
SET @right = @width - CHAR_LENGTH(@text) - @left;

SELECT RPAD(LPAD(@text, @left + CHAR_LENGTH(@text), ' '), @width, ' ') AS centered;
```

## LPAD with dates

```sql
-- Format month and day with leading zeros
SELECT CONCAT(
    YEAR(NOW()), '-',
    LPAD(MONTH(NOW()), 2, '0'), '-',
    LPAD(DAY(NOW()), 2, '0')
) AS iso_date;
-- '2026-03-31'

-- MySQL's DATE_FORMAT is cleaner for this:
SELECT DATE_FORMAT(NOW(), '%Y-%m-%d');
```

## Truncation behaviour

```sql
-- Both functions truncate when len < length of str
SELECT LPAD('Hello World', 5, '*');  -- 'Hello'
SELECT RPAD('Hello World', 5, '*');  -- 'Hello'
```

This makes LPAD/RPAD useful as a combined pad-or-truncate function for fixed-width field generation.

## Sorting strings that contain numbers

```sql
-- Without LPAD, '10' sorts before '9' alphabetically
SELECT name FROM products ORDER BY name;

-- With LPAD on extracted numeric part, sort is correct
SELECT name FROM products ORDER BY LPAD(name, 20, '0');
```

## Summary

`LPAD(str, len, padstr)` pads a string on the left; `RPAD(str, len, padstr)` pads on the right. Both truncate the string if it already exceeds `len`. Use them for zero-padding IDs, generating fixed-width columns in text reports, and producing formatted codes. For date formatting, prefer `DATE_FORMAT()` which handles the zero-padding automatically.

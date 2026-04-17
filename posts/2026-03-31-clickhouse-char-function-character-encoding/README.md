# How to Use char() Function for Character Encoding in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String, CHAR, Character Encoding, ASCII, Function

Description: Learn how to use the char() function in ClickHouse to generate characters from ASCII or Unicode code points for string construction and encoding tasks.

---

The `char()` function in ClickHouse constructs a string from one or more integer code point values. It is useful for generating special characters, building delimiter-separated strings, and working with binary or ASCII-encoded data.

## Function Signature

```sql
char(code_point1 [, code_point2, ...]) -> String
```

Pass one or more integer values representing character code points. The function concatenates the resulting characters into a single string.

## Basic ASCII Examples

```sql
SELECT
    char(65)          AS letter_A,
    char(72, 101, 108, 108, 111) AS hello,
    char(10)          AS newline_char,
    char(9)           AS tab_char
```

```text
letter_A  hello  newline_char  tab_char
--------  -----  ------------  --------
A         Hello  \n            \t
```

## Building CSV Separators

```sql
SELECT
    concat(name, char(44), email, char(44), toStringOrNull(age)) AS csv_row
FROM users
LIMIT 5
```

`char(44)` produces a comma, making it easy to build CSV rows without hardcoding the literal comma character in different contexts.

## Generating Tab-Separated Output

```sql
SELECT
    concat(
        toString(user_id), char(9),
        username, char(9),
        toString(signup_date)
    ) AS tsv_row
FROM users
LIMIT 10
```

## Creating Null Byte Delimiters

Some binary protocols use null bytes as delimiters. You can generate them with `char(0)`:

```sql
SELECT
    length(concat(field1, char(0), field2)) AS binary_len,
    hex(concat(field1, char(0), field2))    AS hex_repr
FROM binary_data_table
```

## Multi-byte UTF-8 Characters

Each argument to `char()` is interpreted as a single byte (values out of `UInt8` range are converted to `UInt8` with possible overflow). Because ClickHouse strings are byte sequences, producing a non-ASCII character means passing its full UTF-8 byte sequence rather than its Unicode code point:

```sql
SELECT
    char(0xC2, 0xA9) AS copyright_sign,
    char(0xC2, 0xB0) AS degree_sign,
    char(0xC2, 0xB5) AS micro_sign
```

```text
copyright_sign  degree_sign  micro_sign
--------------  -----------  ----------
©               °            µ
```

## Generating Padding Characters

```sql
SELECT
    lpad(toString(order_id), 10, char(48)) AS padded_id
FROM orders
LIMIT 5
```

`char(48)` is `'0'`, so this left-pads order IDs with zeros to a width of 10.

## Practical Use: Encoding Separators Dynamically

```sql
WITH toUInt32(separator_code) AS sep_code
SELECT
    arrayStringConcat(
        [field_a, field_b, field_c],
        char(sep_code)
    ) AS encoded_row
FROM data_table
SETTINGS max_rows_to_read = 1000
```

By storing the separator code point as a column or parameter, you can change delimiter encoding without modifying query logic.

## Summary

The `char()` function in ClickHouse converts integer code points into string characters, enabling dynamic string construction with any ASCII or extended character. It is especially useful for generating delimiters, padding characters, control characters, and encoding special symbols in output rows. Combine it with `concat()` and `arrayStringConcat()` for flexible string building pipelines.

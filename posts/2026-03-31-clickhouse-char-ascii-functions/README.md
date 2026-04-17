# How to Use char() and ascii() Functions in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Encoding, SQL

Description: Learn how char() builds strings from ASCII code values and ascii() retrieves the code of the first character, enabling control character handling and encoding work.

---

Most string functions in ClickHouse operate on human-readable text, but occasionally you need to work at the level of individual character codes. `char()` constructs a string from a sequence of ASCII (or byte) values, while `ascii()` extracts the numeric code of the first character in a string. Together they bridge the gap between raw byte values and string representations, which is useful when dealing with control characters, binary protocols, custom delimiters, and character validation logic.

## char()

`char(n1, n2, n3, ...)` takes one or more integer arguments and returns a string whose bytes correspond to those values. For standard ASCII (0-127), this maps directly to ASCII characters. For values 128-255, it produces the corresponding single byte, which is useful for Latin-1 and similar encodings.

```sql
-- Build strings from ASCII codes
SELECT
    char(72, 101, 108, 108, 111) AS hello,
    char(65, 66, 67)             AS ABC,
    char(10)                     AS newline_byte,
    char(9)                      AS tab_byte;
```

```text
hello | ABC | newline_byte | tab_byte
------|-----|--------------|----------
Hello | ABC | (newline)    | (tab)
```

```sql
-- Common control character codes
SELECT
    char(9)   AS tab,          -- \t
    char(10)  AS line_feed,    -- \n
    char(13)  AS carriage_ret, -- \r
    char(0)   AS null_byte,    -- \0
    char(32)  AS space,
    char(127) AS del_char;
```

## ascii()

`ascii(str)` returns the ASCII code of the first character (first byte) of the string as an `Int32`. If the string is empty, it returns `0`.

```sql
-- Get ASCII codes of individual characters
SELECT
    ascii('A')   AS code_A,
    ascii('a')   AS code_a,
    ascii('0')   AS code_zero,
    ascii(' ')   AS code_space,
    ascii('')    AS code_empty;
```

```text
code_A | code_a | code_zero | code_space | code_empty
-------|--------|-----------|------------|-----------
65     | 97     | 48        | 32         | 0
```

```sql
-- Determine case: uppercase letters have codes 65-90, lowercase 97-122
SELECT
    char_val,
    ascii(char_val)                                       AS code,
    ascii(char_val) BETWEEN 65 AND 90                    AS is_uppercase,
    ascii(char_val) BETWEEN 97 AND 122                   AS is_lowercase,
    ascii(char_val) BETWEEN 48 AND 57                    AS is_digit
FROM (
    SELECT 'H' AS char_val UNION ALL
    SELECT 'e' UNION ALL
    SELECT '3' UNION ALL
    SELECT '!'
);
```

## Encoding and Decoding Characters

`char()` and `ascii()` are inverses of each other for single-byte ASCII characters.

```sql
-- Round-trip: char(ascii(c)) == c for single-character ASCII strings
SELECT
    original,
    ascii(original)                AS code,
    char(ascii(original))          AS decoded,
    original = char(ascii(original)) AS round_trip_ok
FROM (
    SELECT 'A' AS original UNION ALL
    SELECT 'z' UNION ALL
    SELECT '9' UNION ALL
    SELECT '@'
);
```

```text
original | code | decoded | round_trip_ok
---------|------|---------|-------------
A        | 65   | A       | 1
z        | 122  | z       | 1
9        | 57   | 9       | 1
@        | 64   | @       | 1
```

## Working with Control Characters in Data

Control characters (codes 0-31) are sometimes embedded in raw data from legacy systems or binary protocols. `ascii()` helps you detect and classify them.

```sql
-- Detect rows containing control characters (codes 0-31) in a text field
SELECT
    record_id,
    raw_value,
    ascii(raw_value) AS first_byte_code
FROM ingested_records
WHERE ascii(raw_value) < 32 AND ascii(raw_value) > 0
LIMIT 20;
```

```sql
-- Strip leading control characters by checking the first byte
SELECT
    raw_value,
    if(
        ascii(raw_value) < 32,
        substring(raw_value, 2),
        raw_value
    ) AS cleaned_value
FROM ingested_records
LIMIT 10;
```

## Constructing Special Delimiters

Some data pipelines use non-printable characters as field delimiters to avoid conflicts with content. `char()` generates these cleanly without needing escape sequences.

```sql
-- Build a record using ASCII unit separator (code 31) as a delimiter
SELECT
    concat(
        'field1',
        char(31),
        'field2',
        char(31),
        'field3'
    ) AS us_delimited_record;
```

```sql
-- Split on the unit separator by using it as a separator in splitByChar
SELECT
    splitByChar(char(31), us_delimited_record) AS fields
FROM (
    SELECT concat('alpha', char(31), 'beta', char(31), 'gamma') AS us_delimited_record
);
```

```text
fields
----------------------
['alpha', 'beta', 'gamma']
```

## Building ASCII Art and Visual Patterns

For diagnostic output or formatted dashboards in the CLI, `char()` provides access to box-drawing and other printable ASCII characters.

```sql
-- Build a simple progress bar using repeated block characters
SELECT
    number AS pct,
    concat(
        '[',
        repeat(char(61), toUInt32(number / 5)),      -- '=' characters
        repeat(char(32), 20 - toUInt32(number / 5)), -- spaces
        '] ',
        toString(number),
        '%'
    ) AS progress_bar
FROM numbers(0, 101, 10);
```

```text
pct | progress_bar
----|---------------------------
0   | [                    ] 0%
10  | [==                  ] 10%
50  | [==========          ] 50%
100 | [====================] 100%
```

## Validating Character Ranges

`ascii()` is useful for validating that string fields only contain characters within an expected range, such as printable ASCII.

```sql
-- Count rows with non-printable characters in a text column
SELECT count()
FROM raw_input
WHERE ascii(substring(value, 1, 1)) < 32
   OR ascii(substring(value, length(value), 1)) < 32;
```

```sql
-- Report on character distribution in the first byte of a column
SELECT
    ascii(value)     AS first_byte,
    char(ascii(value)) AS character,
    count()          AS occurrences
FROM raw_input
GROUP BY first_byte, character
ORDER BY occurrences DESC
LIMIT 20;
```

## Summary

`char()` and `ascii()` provide low-level access to byte-value character operations in ClickHouse. Use `char()` to construct strings with control characters, non-printable delimiters, or specific byte sequences without relying on escape syntax. Use `ascii()` to inspect the first byte of a string, classify characters by their code range, detect control characters in ingested data, and validate that fields contain only expected byte values. Together they are useful companions for binary data handling, legacy data migration, and diagnostic tooling.

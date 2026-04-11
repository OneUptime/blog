# How to Use REPEAT() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Database

Description: Learn how REPEAT() duplicates a string a specified number of times in MySQL, with examples for generating separators, padding, progress bars, and test data.

---

`REPEAT(str, count)` returns a string consisting of `str` repeated `count` times. It is useful for generating padding, separators, test data, and simple visual output.

## Syntax

```sql
REPEAT(str, count)
```

- `str` - the string to repeat.
- `count` - number of times to repeat. If `count` is 0 or less, returns an empty string.
- Returns `NULL` if either argument is `NULL`.

## Basic usage

```sql
SELECT REPEAT('a', 5);       -- 'aaaaa'
SELECT REPEAT('ab', 3);      -- 'ababab'
SELECT REPEAT('-', 20);      -- '--------------------'
SELECT REPEAT('* ', 4);      -- '* * * * '
SELECT REPEAT('ha', 0);      -- ''
SELECT REPEAT(NULL, 3);      -- NULL
SELECT REPEAT('x', NULL);    -- NULL
```

## Generating a separator line

```sql
SELECT REPEAT('=', 40) AS separator;
-- '========================================'
```

## Simple text-based progress bar

```sql
CREATE TABLE tasks (
    task_id  INT PRIMARY KEY,
    name     VARCHAR(100),
    progress INT  -- 0 to 100
);

INSERT INTO tasks VALUES (1,'Import data',75),(2,'Build report',40),(3,'Send email',100);

SELECT
    name,
    progress,
    CONCAT(
        '[',
        REPEAT('#', progress DIV 10),
        REPEAT('.', 10 - progress DIV 10),
        '] ',
        progress, '%'
    ) AS bar
FROM tasks;
```

Result:

| name | progress | bar |
|---|---|---|
| Import data | 75 | [#######...] 75% |
| Build report | 40 | [####......] 40% |
| Send email | 100 | [##########] 100% |

## Padding a string manually

```sql
-- Left-pad a number to 6 digits (prefer LPAD for this)
SELECT CONCAT(REPEAT('0', 6 - LENGTH(CAST(42 AS CHAR))), 42);
-- '000042'

-- LPAD is cleaner for this:
SELECT LPAD(42, 6, '0');  -- '000042'
```

## Generating test rows with repeated data

```sql
-- Insert 5 rows of test data using a sequence table
INSERT INTO test_log (message)
SELECT REPEAT('Test log entry ', 1)
FROM (
    SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3
    UNION ALL SELECT 4 UNION ALL SELECT 5
) AS seq;
```

## Building CSV headers

```sql
SELECT REPEAT(',', 4) AS csv_header;
-- ',,,,' (5 empty fields placeholder)
```

## Repeating a delimiter

```sql
-- Create an indented tree display
CREATE TABLE categories (
    id     INT PRIMARY KEY,
    name   VARCHAR(60),
    depth  INT
);

INSERT INTO categories VALUES (1,'Root',0),(2,'Child',1),(3,'Grandchild',2);

SELECT
    CONCAT(REPEAT('  ', depth), name) AS indented_name
FROM categories
ORDER BY id;
```

Result:

```text
Root
  Child
    Grandchild
```

## Combining with other functions

```sql
-- Center a label in a 40-char field
SET @label = 'MySQL';
SET @width = 40;
SET @pad = (@width - CHAR_LENGTH(@label)) DIV 2;

SELECT CONCAT(REPEAT(' ', @pad), @label, REPEAT(' ', @pad)) AS centered;
```

## Performance note

`REPEAT` with a very large `count` generates a long string in memory. MySQL limits string functions by `max_allowed_packet`. For normal use (under a few hundred repetitions), there is no practical concern.

```sql
-- Check the current limit
SHOW VARIABLES LIKE 'max_allowed_packet';
```

## Summary

`REPEAT(str, count)` repeats a string a given number of times. It is most useful for generating separators, progress bars, indented tree displays, and test data patterns. For zero or negative count values, it returns an empty string. Prefer `LPAD` and `RPAD` when you need fixed-width padding, as they are more explicit about the target width.

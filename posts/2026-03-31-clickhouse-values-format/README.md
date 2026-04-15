# How to Use Values Format in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Values Format, SQL INSERT, Data Import, Compatibility

Description: Learn how to use the Values format in ClickHouse for importing and exporting data in SQL VALUES syntax compatible with standard SQL INSERT statements.

---

The Values format in ClickHouse serializes data as SQL VALUES syntax - the same format used in INSERT statements. It is useful for generating SQL dump files, compatibility with other databases, and ad-hoc data inserts via SQL scripts.

## What Values Format Looks Like

```sql
SELECT id, name, value FROM my_table LIMIT 3 FORMAT Values;
```

Output:

```text
(1,'Alice',3.14),(2,'Bob',2.71),(3,'Charlie',1.41)
```

Each row is a parenthesized tuple, and rows are comma-separated on a single line.

## Using Values Format for INSERT

The standard SQL INSERT syntax uses Values format by default:

```sql
INSERT INTO my_table VALUES
(1, 'Alice', 3.14),
(2, 'Bob', 2.71),
(3, 'Charlie', 1.41);
```

This is Values format - you can also specify it explicitly:

```sql
INSERT INTO my_table FORMAT Values
(1, 'Alice', 3.14),
(2, 'Bob', 2.71);
```

## Exporting as SQL Dump

You can export a table as a SQL VALUES dump:

```bash
clickhouse-client \
    --query "SELECT * FROM events WHERE ts >= '2024-01-01' FORMAT Values" \
    > events_dump.sql
```

To create a complete INSERT statement:

```bash
echo "INSERT INTO events VALUES" > full_dump.sql
clickhouse-client \
    --query "SELECT * FROM events FORMAT Values" \
    >> full_dump.sql
```

## Importing from Values File

```bash
clickhouse-client \
    --query "INSERT INTO events FORMAT Values" \
    < events_dump.sql
```

## Expressions in Values

Values format supports expressions and functions, not just literals:

```sql
INSERT INTO events FORMAT Values
(1, 'page_view', now(), 42),
(2, 'click', now() - INTERVAL 1 HOUR, 43);
```

ClickHouse evaluates the expressions server-side. This is different from most other formats which accept only literal values. Note that expression evaluation in Values format uses a slower code path, so it is not recommended for high-volume inserts.

## Settings

```sql
-- Enable full SQL parser for expressions in Values input (enabled by default)
SET input_format_values_interpret_expressions = 1;

-- Enable template deduction for repeated expressions to improve performance (enabled by default)
SET input_format_values_deduce_templates_of_expressions = 1;
```

## Comparing Values with CSV and JSONEachRow

```text
Format       Human-Readable   SQL Compatible   Import/Export
Values       Yes              Yes              Both
CSV          Yes              No               Both
JSONEachRow  Yes              No               Both
```

Values format is the primary format natively compatible with SQL INSERT syntax. ClickHouse also offers the SQLInsert output format for generating complete INSERT statements.

## Limitations

- Output is on a single line by default (rows comma-separated), which is not ideal for very large exports
- Less efficient than binary formats for large data volumes
- Not suitable for high-throughput bulk imports (use CSV or Native instead)

## Compatibility with Other Databases

Values format produces output similar to MySQL and PostgreSQL INSERT syntax, making it useful for:
- Migrating small datasets from other databases to ClickHouse
- Generating test data scripts
- Creating reproducible SQL fixtures for integration tests

By default, ClickHouse escapes single quotes with a backslash (`\'`). For PostgreSQL compatibility, set `output_format_values_escape_quote_with_quote = 1` to use SQL-standard quote escaping (`''`).

```sql
-- This output can often be used in MySQL or PostgreSQL with simple data types
SELECT id, name, toUnixTimestamp(ts)
FROM events
LIMIT 10
FORMAT Values;
```

## Summary

Values format is ClickHouse's SQL-compatible data serialization format, matching the syntax of SQL INSERT statements. It is ideal for generating SQL dump files, small-scale migrations, and test fixtures. For large-scale data import and export, prefer CSV, Parquet, or Arrow formats for better performance and smaller file sizes.

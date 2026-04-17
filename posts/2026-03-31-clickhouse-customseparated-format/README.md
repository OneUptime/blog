# How to Use CustomSeparated Format in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, CSV, Data Engineering, Import

Description: Learn how to use ClickHouse's CustomSeparated format to parse files with any delimiter, quoting style, row separator, and custom escaping rules.

## What Is CustomSeparated?

`CustomSeparated` is a highly configurable text format in ClickHouse that lets you define your own delimiter, quoting character, row separator, null representation, and escaping rules. It is the right tool when your data does not fit the standard CSV or TSV conventions - for example, pipe-delimited files, files with custom null markers, or exports from legacy systems with unusual formatting.

## Core Settings

All `CustomSeparated` behavior is controlled by format settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `format_custom_field_delimiter` | `\t` | Delimiter between fields |
| `format_custom_row_before_delimiter` | (empty) | String before each row |
| `format_custom_row_after_delimiter` | `\n` | String after each row |
| `format_custom_row_between_delimiter` | (empty) | String between rows |
| `format_custom_result_before_delimiter` | (empty) | String at start of output |
| `format_custom_result_after_delimiter` | (empty) | String at end of output |
| `format_custom_escaping_rule` | `Escaped` | Escaping style: Escaped, Quoted, CSV, JSON, XML, Raw |

## Parsing a Pipe-Delimited File

Given a file `access.log` with pipe separators:

```text
192.168.1.1|GET|/api/users|200|142
10.0.0.5|POST|/api/orders|201|0
172.16.0.3|DELETE|/api/items/7|404|88
```

Read it with:

```sql
SET format_custom_field_delimiter = '|';
SET format_custom_escaping_rule = 'Raw';

SELECT *
FROM file('access.log', CustomSeparated);
```

## Parsing a Semicolon File with Quoted Strings

Input file `contacts.csv`:

```text
"Smith, John";"john@example.com";"2025-01-15"
"Doe, Jane";"jane@example.com";"2025-02-20"
```

```sql
SET format_custom_field_delimiter = ';';
SET format_custom_escaping_rule = 'Quoted';

SELECT *
FROM file('contacts.csv', CustomSeparated);
```

## Loading Data into a Table

```sql
CREATE TABLE web_logs
(
    client_ip   String,
    method      LowCardinality(String),
    path        String,
    status_code UInt16,
    bytes_sent  UInt32
)
ENGINE = MergeTree()
ORDER BY client_ip;

SET format_custom_field_delimiter = '|';
SET format_custom_escaping_rule = 'Raw';

INSERT INTO web_logs
SELECT *
FROM file('access.log', CustomSeparated);
```

## CustomSeparatedWithNames

Like `CSVWithNames`, this variant reads column names from the first row:

```text
client_ip|method|path|status_code|bytes_sent
192.168.1.1|GET|/api/users|200|142
```

```sql
SET format_custom_field_delimiter = '|';

SELECT *
FROM file('access_with_header.log', CustomSeparatedWithNames);
```

## CustomSeparatedWithNamesAndTypes

First row contains names, second row contains ClickHouse type names:

```text
client_ip|method|status_code
String|String|UInt16
192.168.1.1|GET|200
```

```sql
SET format_custom_field_delimiter = '|';

SELECT *
FROM file('access_typed.log', CustomSeparatedWithNamesAndTypes);
```

## Escaping Rules

The `format_custom_escaping_rule` controls how values are escaped:

| Rule | Description |
|------|-------------|
| `Escaped` | Backslash escaping (like TSV) |
| `Quoted` | Double-quote escaping (like CSV) |
| `CSV` | RFC 4180 quoting |
| `JSON` | JSON string escaping |
| `XML` | XML entity escaping |
| `Raw` | No escaping - values must not contain delimiter |

Choose `Raw` for the fastest parsing when you are confident values are clean.

## Row Delimiters

Customize what appears around each row:

```sql
-- Output rows as SQL value tuples: (val1, val2)
SET format_custom_row_before_delimiter = '(';
SET format_custom_field_delimiter = ', ';
SET format_custom_row_after_delimiter = ')';
SET format_custom_row_between_delimiter = ',\n';
SET format_custom_result_before_delimiter = 'INSERT INTO t VALUES\n';
SET format_custom_result_after_delimiter = ';';

SELECT id, name, price FROM products FORMAT CustomSeparated;
```

Output:

```text
INSERT INTO t VALUES
(1, Widget, 9.99),
(2, Gadget, 24.99);
```

## NULL Representation

```sql
SET format_custom_null_representation = 'NULL';

-- Write NULL as 'NULL' string instead of empty field
SELECT id, nullable_col FROM table FORMAT CustomSeparated;
```

## Regex-Based Parsing with the Regexp Format

For complex log formats, use the `Regexp` format:

```sql
SET format_regexp = '^(\\S+) (\\S+) (\\d+)$';
SET format_regexp_escaping_rule = 'Raw';
SET format_regexp_skip_unmatched = 1;

SELECT *
FROM file('logs.txt', Regexp);
```

This parses lines matching the regex, skipping any that do not match.

## Practical Example: Apache Access Log

Apache access logs have a distinctive format:

```text
127.0.0.1 - frank [10/Oct/2024:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326
```

Use a regex to parse them:

```sql
SET format_regexp = '^(\\S+) \\S+ (\\S+) \\[([^\\]]+)\\] "(\\S+) (\\S+) (\\S+)" (\\d+) (\\d+)$';
SET format_regexp_escaping_rule = 'Raw';
SET format_regexp_skip_unmatched = 1;

SELECT *
FROM file('access.log', Regexp);
```

## Performance Tips

1. Use `Raw` escaping for the fastest parsing when data is clean.
2. Avoid regex-based parsing for very large files - it is significantly slower than delimiter-based parsing.
3. For files with millions of rows, convert to Parquet or Arrow first.
4. Use `CustomSeparatedWithNamesAndTypes` in automated pipelines to validate schema at read time.

## Conclusion

`CustomSeparated` is ClickHouse's escape hatch for unusual text formats. Instead of writing a pre-processor to convert your data to CSV or TSV, configure ClickHouse to read your format directly. This eliminates an ETL step and reduces the chance of data corruption during conversion.

**Related Reading:**

- [How to Use CSV Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-csv-format/view)
- [How to Use TabSeparated Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-tabseparated-format/view)
- [How to Use Template Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-template-format/view)

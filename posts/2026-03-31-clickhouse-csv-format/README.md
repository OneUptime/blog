# How to Use CSV Format in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, CSV, Data Engineering, Import

Description: Learn how to import and export CSV files in ClickHouse, handle headers, custom delimiters, quoting, null values, and troubleshoot common CSV parsing errors.

## What Is CSV in ClickHouse?

ClickHouse's `CSV` format follows RFC 4180 conventions. Fields are separated by commas, values containing commas or newlines are quoted with double quotes, and double quotes inside fields are escaped by doubling them (`""`). ClickHouse also supports `CSVWithNames` and `CSVWithNamesAndTypes` for self-describing files.

CSV variants in ClickHouse:

| Format | Description |
|--------|-------------|
| `CSV` | Plain comma-separated values with quoting |
| `CSVWithNames` | First row is column names |
| `CSVWithNamesAndTypes` | First row names, second row types |

## Reading a CSV File

Given a file `products.csv`:

```text
1,Widget,9.99,100
2,Gadget,24.99,50
3,Doohickey,4.49,200
```

Query directly:

```sql
SELECT *
FROM file('products.csv', CSV)
LIMIT 10;
```

With a header row:

```text
id,name,price,stock
1,Widget,9.99,100
```

```sql
SELECT *
FROM file('products_with_header.csv', CSVWithNames);
```

## Creating a Table and Loading CSV

```sql
CREATE TABLE products
(
    id    UInt32,
    name  String,
    price Float64,
    stock UInt32
)
ENGINE = MergeTree()
ORDER BY id;

INSERT INTO products
SELECT *
FROM file('products.csv', CSV);
```

From the command line:

```bash
clickhouse-client \
  --query "INSERT INTO products FORMAT CSVWithNames" \
  < products_with_header.csv
```

## Exporting to CSV

```sql
SELECT id, name, price, stock
FROM products
FORMAT CSV;
```

With header:

```sql
SELECT id, name, price, stock
FROM products
FORMAT CSVWithNames;
```

Export to a file:

```sql
SELECT *
FROM products
INTO OUTFILE 'products_export.csv'
FORMAT CSVWithNamesAndTypes;
```

## Custom Delimiter

The default delimiter is a comma. Change it to semicolons or pipes:

```sql
SET format_csv_delimiter = ';';

SELECT *
FROM file('products_semicolon.csv', CSV);
```

Or use pipes:

```sql
SET format_csv_delimiter = '|';
```

## Handling Quotes

ClickHouse accepts both double and single quotes in CSV input by default. Control which are allowed:

```sql
SET format_csv_allow_single_quotes = 1; -- accept 'value'
SET format_csv_allow_double_quotes = 1; -- accept "value"
```

Use LF (Unix) instead of CRLF (Windows) line endings in output:

```sql
SET output_format_csv_crlf_end_of_line = 0;
```

## NULL Values

By default, ClickHouse represents NULL as an empty field in CSV. Change the null representation:

```sql
SET format_csv_null_representation = 'NULL';
```

Read a CSV where NULL is represented as `\N`:

```sql
SET input_format_csv_empty_as_default = 0;
SET format_csv_null_representation = '\N';
```

## Handling Quotes in Fields

A field containing a comma, newline, or double quote:

```text
1,"Widget, Pro","This has a ""quote"" inside",9.99
```

ClickHouse handles RFC 4180 quoting automatically. The third field parses to:

```text
This has a "quote" inside
```

## Type Inference

ClickHouse can infer types when reading CSV without a target table schema:

```sql
DESCRIBE file('products.csv', CSV);
```

Control inference:

```sql
SET input_format_csv_detect_header = 1;
SET schema_inference_make_columns_nullable = 0;
```

## Loading from S3

```sql
INSERT INTO products
SELECT *
FROM s3(
    'https://my-bucket.s3.amazonaws.com/data/products*.csv',
    'ACCESS_KEY',
    'SECRET_KEY',
    'CSVWithNames'
);
```

## Common Errors and Fixes

**Error: "Cannot parse input: expected , before ..."**

The delimiter does not match. Check `format_csv_delimiter`:

```sql
SET format_csv_delimiter = ';';
```

**Error: "Cannot read all data. Bytes read: N. Expected: M."**

The file is truncated or has Windows line endings. Convert to Unix:

```bash
dos2unix products.csv
```

**Error: "Too many rows"**

The file has an embedded newline inside an unquoted field. Use `TabSeparated` instead, or ensure all fields are quoted.

## Performance Tips

1. **Skip quote handling** with `SET format_csv_allow_single_quotes = 0` when your data uses only double quotes - this avoids extra parsing checks.
2. **Use CSVWithNamesAndTypes** for automated pipelines so the target table schema can be validated against the file.
3. **For large bulk loads**, prefer binary formats (Parquet, Arrow) which are 5-10x faster to parse.
4. **Compress CSV files** before S3 upload: `.csv.gz` files are read transparently by ClickHouse.

```bash
gzip products.csv
# ClickHouse detects .gz extension automatically
clickhouse-client --query "SELECT * FROM file('products.csv.gz', CSVWithNames)"
```

## Conclusion

CSV is the lowest-common-denominator data exchange format and ClickHouse handles it robustly. Use it when integrating with spreadsheets, BI tools, or any system that exports CSV. For performance-critical bulk imports, consider converting CSV to Parquet first.

**Related Reading:**

- [How to Use TabSeparated Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-tabseparated-format/view)
- [How to Use CustomSeparated Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-customseparated-format/view)
- [How to Import Data from S3 in Various Formats in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-import-from-s3/view)

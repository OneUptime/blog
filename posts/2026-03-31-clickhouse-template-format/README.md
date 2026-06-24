# How to Use Template Format in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Template, Data Engineering, Export

Description: Learn how to use ClickHouse's Template format to produce custom text output with arbitrary delimiters, headers, footers, and per-row formatting using Jinja-like templates.

## What Is Template Format?

`Template` is a ClickHouse output (and input) format that lets you define exactly how your data should be serialized using a template string. You control what appears before the first row, between rows, and after the last row. Each row's fields can be formatted with custom escaping and delimiters.

This is the most flexible text format in ClickHouse - if none of the built-in formats (CSV, TSV, JSON, etc.) match your target format, `Template` can produce it exactly.

## Template Components

A Template format configuration uses three settings:

| Setting | Description |
|---------|-------------|
| `format_template_resultset` | Path to template file for the overall result (header/footer) |
| `format_template_row` | Path to template file for each row |
| `format_template_rows_between_delimiter` | String to insert between rows |

## Row Template Syntax

Row templates use `${column_name:escaping}` placeholders:

| Escaping Rule | Description |
|--------------|-------------|
| `None` or `Raw` | No escaping |
| `Escaped` | Backslash escaping (like TSV) |
| `Quoted` | Single-quote escaping (like Values format) |
| `JSON` | JSON string escaping |
| `XML` | XML entity escaping |
| `CSV` | CSV escaping (similar to ClickHouse CSV format) |

## Example 1: Custom SQL INSERT Statements

Generate SQL INSERT statements from a query result.

Create the row template file `insert_row.tmpl`:

```text
(${id:Raw}, '${name:Escaped}', ${price:Raw}, ${stock:Raw})
```

Create the resultset template file `insert_result.tmpl`:

```text
INSERT INTO products (id, name, price, stock) VALUES
${data}
;
```

Run the query:

```sql
SELECT id, name, price, stock
FROM products
FORMAT Template
SETTINGS
    format_template_resultset = '/path/to/insert_result.tmpl',
    format_template_row = '/path/to/insert_row.tmpl',
    format_template_rows_between_delimiter = ',\n';
```

Output:

```text
INSERT INTO products (id, name, price, stock) VALUES
(1, 'Widget', 9.99, 100),
(2, 'Gadget', 24.99, 50),
(3, 'Doohickey', 4.49, 200)
;
```

## Example 2: HTML Table

Generate an HTML table of query results.

Row template `html_row.tmpl`:

```text
    <tr><td>${id:XML}</td><td>${name:XML}</td><td>${price:XML}</td></tr>
```

Resultset template `html_table.tmpl`:

```text
<!DOCTYPE html>
<html>
<head><title>Products</title></head>
<body>
<table border="1">
  <thead><tr><th>ID</th><th>Name</th><th>Price</th></tr></thead>
  <tbody>
${data}
  </tbody>
</table>
</body>
</html>
```

Query:

```sql
SELECT id, name, price
FROM products
FORMAT Template
SETTINGS
    format_template_resultset = '/path/to/html_table.tmpl',
    format_template_row = '/path/to/html_row.tmpl',
    format_template_rows_between_delimiter = '\n';
```

Output:

```text
<!DOCTYPE html>
<html>
<head><title>Products</title></head>
<body>
<table border="1">
  <thead><tr><th>ID</th><th>Name</th><th>Price</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>Widget</td><td>9.99</td></tr>
    <tr><td>2</td><td>Gadget</td><td>24.99</td></tr>
  </tbody>
</table>
</body>
</html>
```

## Example 3: Prometheus Metrics Format

Row template `prometheus_row.tmpl`:

```text
http_requests_total{method="${method:Raw}",status="${status:Raw}"} ${count:Raw}
```

Resultset template `prometheus_result.tmpl`:

```text
# HELP http_requests_total Total HTTP request count
# TYPE http_requests_total counter
${data}
```

Query:

```sql
SELECT method, status, count() AS count
FROM access_logs
GROUP BY method, status
FORMAT Template
SETTINGS
    format_template_resultset = '/path/to/prometheus_result.tmpl',
    format_template_row = '/path/to/prometheus_row.tmpl',
    format_template_rows_between_delimiter = '\n';
```

Output:

```text
# HELP http_requests_total Total HTTP request count
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 15420
http_requests_total{method="POST",status="201"} 3892
http_requests_total{method="GET",status="404"} 256
```

## Using Template for Input

Template format also supports reading data. Given an input file in a custom format:

```text
ID=1; NAME=Widget; PRICE=9.99
ID=2; NAME=Gadget; PRICE=24.99
```

Create an input row template `input_row.tmpl`:

```text
ID=${id:Escaped}; NAME=${name:Escaped}; PRICE=${price:Escaped}
```

Read it:

```sql
SELECT *
FROM file('products_custom.txt', Template)
SETTINGS
    format_template_row = '/path/to/input_row.tmpl';
```

## TemplateIgnoreSpaces

The `TemplateIgnoreSpaces` input format is like `Template` but ignores whitespace between delimiters and fields. Useful for parsing human-formatted text:

```sql
SELECT *
FROM file('flexible_format.txt', TemplateIgnoreSpaces)
SETTINGS
    format_template_row = '/path/to/row.tmpl';
```

## Storing Templates Inline

For simple templates, you can define them inline using a single-file approach with shell here-documents:

```bash
# Create template files
echo '(${id:Raw}, '"'"'${name:Escaped}'"'"', ${price:Raw})' > /tmp/row.tmpl
echo 'INSERT INTO products VALUES${data};' > /tmp/result.tmpl

clickhouse-client \
  --query "SELECT id, name, price FROM products FORMAT Template" \
  --format_template_resultset=/tmp/result.tmpl \
  --format_template_row=/tmp/row.tmpl \
  --format_template_rows_between_delimiter=','
```

## Resultset Template Variables

The resultset template can reference special variables:

| Variable | Description |
|----------|-------------|
| `${data}` | The rendered rows |
| `${rows}` | Number of data rows |
| `${rows_before_limit_at_least}` | Rows before LIMIT |
| `${time}` | Query execution time |
| `${rows_read}` | Rows read from storage |
| `${bytes_read}` | Bytes read from storage |

```text
-- result template with statistics
${data}
-- Query returned ${rows} rows in ${time} seconds
```

## Practical Tips

1. Store templates in a dedicated directory and manage them with version control.
2. Use `XML` escaping for HTML output to prevent XSS.
3. Use `JSON` escaping when embedding values in JavaScript.
4. Use `Raw` only when you are certain values contain no special characters.
5. Test templates with `LIMIT 1` first to verify formatting before running on full datasets.

## Conclusion

`Template` format is the final tool in ClickHouse's formatting toolkit. When you need output that exactly matches a target system's expected format - SQL scripts, HTML, configuration files, metric formats - Template lets you define the exact output structure without an external post-processing step.

**Related Reading:**

- [How to Use CustomSeparated Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-customseparated-format/view)
- [How to Export ClickHouse Data to Different File Formats](https://oneuptime.com/blog/post/2026-03-31-clickhouse-export-file-formats/view)
- [How to Use LineAsString Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-lineasstring-format/view)

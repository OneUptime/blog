# How to Use Template Format in ClickHouse for Custom Output

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Template Format, Custom Output, Data Export, Formatting

Description: Learn how to use the Template format in ClickHouse to generate custom-formatted output using user-defined row and result templates.

---

The Template format in ClickHouse lets you define custom output templates using placeholders. You specify a template for each row and optionally for the overall result, making it possible to generate HTML tables, XML documents, custom log formats, or any structured text output directly from ClickHouse queries.

## How Template Format Works

Template format uses two template files:
1. A **row template** defining how each row is formatted
2. An optional **result template** wrapping the entire output (header, footer, separator)

Placeholders use `${column_name:escaping}` syntax.

## Supported Escaping Options

```text
${column_name:None}     - No escaping
${column_name:CSV}      - CSV escaping
${column_name:JSON}     - JSON string escaping
${column_name:XML}      - XML entity escaping
${column_name:Escaped}  - Backslash escaping
${column_name:Quoted}   - SQL quoting
${column_name:Raw}      - Raw bytes
```

## Creating Template Files

Create a row template file (`row_template.txt`):

```text
<tr><td>${id:XML}</td><td>${name:XML}</td><td>${value:XML}</td></tr>
```

Create a result template file (`result_template.txt`):

```text
<!DOCTYPE html>
<html>
<body>
<table>
<tr><th>ID</th><th>Name</th><th>Value</th></tr>
${data}
</table>
</body>
</html>
```

The `${data}` placeholder in the result template is where row output is inserted.

## Configuring ClickHouse to Use Templates

Place template files in the ClickHouse format schemas directory:

```bash
cp row_template.txt /var/lib/clickhouse/format_schemas/
cp result_template.txt /var/lib/clickhouse/format_schemas/
```

## Querying with Template Format

```sql
SELECT id, name, value
FROM my_table
FORMAT Template
SETTINGS
    format_template_row = 'row_template.txt',
    format_template_resultset = 'result_template.txt',
    format_template_rows_between_delimiter = '\n';
```

## Generating JSON with Custom Structure

Create a custom JSON template (`json_row.txt`):

```text
{"event_id": ${event_id:JSON}, "type": ${event_type:JSON}, "timestamp": ${ts:JSON}}
```

Result template (`json_result.txt`):

```text
{"events": [
${data}
]}
```

```sql
SELECT event_id, event_type, ts
FROM events
LIMIT 100
FORMAT Template
SETTINGS
    format_template_row = 'json_row.txt',
    format_template_resultset = 'json_result.txt',
    format_template_rows_between_delimiter = ',\n';
```

## Inline Templates with TemplateIgnoreSpaces

For input parsing with flexible whitespace:

```sql
SET format_template_row = 'row_template.txt';
INSERT INTO my_table FORMAT TemplateIgnoreSpaces;
```

## Generating CSV-Like Custom Delimiters

```text
# custom_csv_row.txt
${id:None}|${name:Escaped}|${value:None}|${ts:None}
```

```sql
SELECT id, name, value, ts
FROM events
FORMAT Template
SETTINGS
    format_template_row = 'custom_csv_row.txt',
    format_template_rows_between_delimiter = '\n';
```

## Template for Import

Templates also work for input parsing:

```text
# import_row.txt
${id:CSV} ${name:CSV} ${value:CSV}
```

```bash
clickhouse-client \
    --query "INSERT INTO my_table FORMAT Template SETTINGS format_template_row='import_row.txt'" \
    < data.txt
```

## Summary

The Template format gives you full control over ClickHouse output formatting, enabling HTML generation, custom XML, non-standard delimiters, and any structured text format. It requires template files stored on the server, making it more complex to set up than standard formats. Use Template when no built-in format meets your output requirements and you need to generate documents or feed downstream systems with a specific structure.

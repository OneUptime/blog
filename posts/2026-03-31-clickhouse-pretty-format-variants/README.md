# How to Use Pretty Format and Its Variants in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Pretty Format, PrettyCompact, PrettySpace, Terminal Output

Description: Learn how to use Pretty format and its variants in ClickHouse for beautifully formatted, human-readable tabular query output in the terminal.

---

Pretty format renders ClickHouse query results as a formatted table with Unicode box-drawing characters, column headers, and alignment. The default output format when using clickhouse-client interactively is PrettyCompact, but you can explicitly use Pretty for the full-grid variant. Several variants trade visual detail for compactness, making Pretty formats useful for dashboards, terminals, and human-readable reports.

## Pretty Format

Pretty draws a full grid around the table where each row occupies two lines in the terminal (one for data, one for the separator):

```sql
SELECT
    event_type,
    count() AS cnt,
    sum(value) AS total
FROM events
GROUP BY event_type
LIMIT 5
FORMAT Pretty;
```

Output:

```text
┌─event_type─┬─────cnt─┬────total─┐
│ page_view  │ 4523190 │ 45231900 │
├────────────┼─────────┼──────────┤
│ click      │ 1823450 │ 18234500 │
├────────────┼─────────┼──────────┤
│ purchase   │  234120 │  2341200 │
├────────────┼─────────┼──────────┤
│ signup     │   12340 │   123400 │
├────────────┼─────────┼──────────┤
│ logout     │   98230 │   982300 │
└────────────┴─────────┴──────────┘
```

## PrettyCompact Format (Default in Interactive Mode)

PrettyCompact is the default format in interactive clickhouse-client. It uses a more compact grid layout than Pretty, where rows do not have separator lines between them:

```sql
SELECT event_type, count() AS cnt
FROM events
GROUP BY event_type
LIMIT 5
FORMAT PrettyCompact;
```

## PrettyCompactMonoBlock

Similar to PrettyCompact but buffers up to 10,000 rows before rendering and outputs them as a single table rather than by blocks, ensuring consistent column widths across the entire result:

```sql
SELECT * FROM my_table LIMIT 100 FORMAT PrettyCompactMonoBlock;
```

## PrettyNoEscapes

Removes ANSI escape codes (colors, bold). Useful for piping output or logging:

```sql
SELECT * FROM system.processes FORMAT PrettyNoEscapes;
```

## PrettyCompactNoEscapes

Combines PrettyCompact and no ANSI escapes:

```sql
SELECT * FROM events LIMIT 10 FORMAT PrettyCompactNoEscapes;
```

## PrettySpace

Uses spaces (whitespace) instead of grid lines to display the table:

```sql
SELECT event_type, count() FROM events GROUP BY event_type FORMAT PrettySpace;
```

Output:

```text
  event_type   count()

  page_view    4523190
  click        1823450
```

## Controlling Row Limits

Pretty format by default limits output to 10,000 rows to prevent terminal flooding. Change this:

```sql
SET output_format_pretty_max_rows = 50000;
SELECT * FROM events LIMIT 50000 FORMAT Pretty;
```

## Column Width Limits

Long string values are truncated in Pretty format:

```sql
SET output_format_pretty_max_column_pad_width = 30;
SET output_format_pretty_max_value_width = 100;
```

## Using Pretty in Scripts

For automated reports or monitoring scripts, disable ANSI escapes:

```bash
clickhouse-client \
    --query "SELECT * FROM system.parts WHERE active = 1 FORMAT PrettyNoEscapes" \
    | tee report.txt
```

## Summary

Pretty format and its variants make ClickHouse query output human-friendly. PrettyCompact is the default for interactive sessions, Pretty provides a full-grid view, PrettyNoEscapes is suited for scripting and logging, and PrettySpace offers minimal table formatting. All Pretty formats are output-only and cannot be used for data import. For production data pipelines, switch to binary or structured formats like Parquet, Arrow, or JSONEachRow.

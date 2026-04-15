# How to Use TabSeparated Format in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, TSV, Data Engineering, Import

Description: Learn how to use ClickHouse's TabSeparated (TSV) format for loading data from spreadsheets, Unix tools, and legacy systems with practical examples.

## What Is TabSeparated?

`TabSeparated` (also known as TSV - Tab-Separated Values) is one of the oldest text data exchange formats. Each row occupies one line, and fields within a row are separated by tab characters (`\t`). ClickHouse supports several TSV variants and uses special escaping rules to handle tabs and newlines inside field values.

This format is ideal for:
- Bulk loading from spreadsheet exports
- Unix tool pipelines using `awk`, `cut`, and `sort`
- Legacy ETL systems that produce TSV
- Human-readable data exchange without quoting complexity

## TabSeparated Variants

| Format | Description |
|--------|-------------|
| `TabSeparated` | Plain TSV, values escaped with backslash |
| `TabSeparatedRaw` | TSV without escaping (values must not contain tabs or newlines) |
| `TabSeparatedWithNames` | First row is column names |
| `TabSeparatedWithNamesAndTypes` | First row names, second row types |
| `TabSeparatedRawWithNames` | Raw TSV with header row |
| `TSV` | Alias for TabSeparated |
| `TSVWithNamesAndTypes` | Alias for TabSeparatedWithNamesAndTypes |

## Reading a TSV File

Given a file `users.tsv`:

```text
1	alice	alice@example.com	2025-01-01
2	bob	bob@example.com	2025-01-02
3	carol	carol@example.com	2025-01-03
```

Query directly:

```sql
SELECT *
FROM file('users.tsv', TabSeparated)
LIMIT 10;
```

With a header row (using `TabSeparatedWithNames`):

```text
id	name	email	created_at
1	alice	alice@example.com	2025-01-01
```

```sql
SELECT *
FROM file('users_with_header.tsv', TabSeparatedWithNames);
```

## Creating a Table and Loading TSV Data

```sql
CREATE TABLE users
(
    id         UInt32,
    name       String,
    email      String,
    created_at Date
)
ENGINE = MergeTree()
ORDER BY id;

INSERT INTO users
SELECT *
FROM file('users.tsv', TabSeparated);
```

From the command line:

```bash
cat users.tsv | clickhouse-client \
  --query "INSERT INTO users FORMAT TabSeparated"
```

## Exporting to TSV

```sql
SELECT id, name, email, created_at
FROM users
FORMAT TabSeparated;
```

With column names in the header:

```sql
SELECT id, name, email, created_at
FROM users
FORMAT TabSeparatedWithNames;
```

Export to a file:

```sql
SELECT *
FROM users
INTO OUTFILE 'users_export.tsv'
FORMAT TabSeparatedWithNamesAndTypes;
```

## Escaping Rules

In `TabSeparated` format, special characters are escaped with a backslash:

| Character | Escaped As |
|-----------|-----------|
| Tab (`\t`) | `\t` |
| Newline (`\n`) | `\n` |
| Carriage return (`\r`) | `\r` |
| Backslash (`\`) | `\\` |
| Null | `\N` |

Example - a field containing a tab:

```text
1	hello\tworld	2025-01-01
```

ClickHouse unescapes this automatically during reading.

## TabSeparatedRaw

When you are certain that field values contain no tabs or newlines, `TabSeparatedRaw` avoids the escaping overhead:

```sql
-- Writing without escaping
SELECT id, name FROM users
INTO OUTFILE 'users_raw.tsv'
FORMAT TabSeparatedRaw;
```

This is faster to write and easier to parse with standard Unix tools.

## Integrating with Unix Tools

Because TSV is native to Unix pipelines, you can pre-process data before inserting:

```bash
# Filter rows where the third column (email) ends with @example.com
grep '@example.com' users.tsv | \
  clickhouse-client --query "INSERT INTO users FORMAT TabSeparated"
```

Sort by date before inserting:

```bash
(head -1 users_with_header.tsv; tail -n +2 users_with_header.tsv | sort -k4) | \
  clickhouse-client --query "INSERT INTO users FORMAT TabSeparatedWithNames"
```

## Handling NULL Values

ClickHouse uses `\N` to represent NULL in TSV format:

```text
1	alice	\N	2025-01-01
```

When reading into a `Nullable(String)` column, `\N` becomes SQL NULL. For non-nullable columns, use `input_format_null_as_default`:

```sql
SET input_format_null_as_default = 1;
```

## Type Inference

ClickHouse performs type inference when reading TSV without a schema. Control inference behavior:

```sql
SET input_format_tsv_detect_header = 1; -- auto-detect header row
SET schema_inference_make_columns_nullable = 0; -- don't make all columns Nullable
```

## Performance Tips

1. Use `TabSeparatedRaw` when field values are clean (no embedded tabs/newlines) for faster parsing.
2. For large files, increase the insert block size: `SET max_insert_block_size = 1048576`.
3. TSV is faster to parse than JSON because there is no key name repetition and less escaping.
4. Use `TabSeparatedWithNamesAndTypes` when building generic importers - the type row removes ambiguity.

## Conclusion

TabSeparated is a reliable, universal format for data exchange with ClickHouse. Its simplicity makes it easy to produce from spreadsheets, Unix tools, and legacy systems. For structured analytical data, it is a step up from CSV because it avoids quoting ambiguity while remaining human-readable.

**Related Reading:**

- [How to Use CSV Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-csv-format/view)
- [How to Use CustomSeparated Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-customseparated-format/view)
- [How to Export ClickHouse Data to Different File Formats](https://oneuptime.com/blog/post/2026-03-31-clickhouse-export-file-formats/view)

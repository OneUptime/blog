# How to Use RawBLOB Format in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Binary, Data Engineering, Storage

Description: Learn how to use ClickHouse's RawBLOB format to store and retrieve entire binary files as single values, ideal for binary data, images, and opaque byte payloads.

## What Is RawBLOB?

`RawBLOB` is a ClickHouse format that reads an entire input stream as a single `String` value without any parsing, splitting, or interpretation. Unlike `LineAsString` which splits on newlines, `RawBLOB` treats the whole file (or entire HTTP request body) as one row with one column.

This format is useful for:
- Storing binary files (images, documents, compressed archives) as BLOB columns
- Round-tripping raw bytes without corruption
- Processing entire file contents as a single value
- Receiving opaque binary payloads from applications

## Important Note on Single Row/Column Requirement

When using `RawBLOB`, the query must return or receive exactly one column of type `String` or `FixedString`. The entire input becomes the value of that one column.

## Reading a File with RawBLOB

```sql
SELECT *
FROM file('logo.png', RawBLOB);
```

This returns a single row with the entire binary content of `logo.png` as a `String`.

## Storing Binary Data

Create a table for binary blobs:

```sql
CREATE TABLE file_store
(
    file_id    UInt64,
    file_name  String,
    mime_type  LowCardinality(String),
    content    String,
    created_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
ORDER BY file_id;
```

## Inserting a Binary File

Since `RawBLOB` works with a single column, the recommended approach is a two-step insert using a staging table. First, upload the raw bytes, then move the data into your main table with metadata.

Upload the file to a staging table:

```sql
CREATE TABLE blob_staging
(
    content String
)
ENGINE = Memory;
```

```bash
curl -X POST \
  'http://localhost:8123/?query=INSERT+INTO+blob_staging+FORMAT+RawBLOB' \
  --data-binary @logo.png
```

Then move the data to the main table with metadata:

```sql
INSERT INTO file_store (file_id, file_name, mime_type, content)
SELECT 1, 'logo.png', 'image/png', content
FROM blob_staging;

TRUNCATE TABLE blob_staging;
```

## Retrieving Binary Data

```bash
# Download the file via HTTP interface
curl -G 'http://localhost:8123/' \
  --data-urlencode "query=SELECT content FROM file_store WHERE file_id = 1 FORMAT RawBLOB" \
  -o downloaded_logo.png
```

The raw bytes of the content column are written directly to the output with no framing or escaping.

## RawBLOB vs Other String Formats

| Format | Input behavior | Output behavior |
|--------|---------------|----------------|
| `RawBLOB` | Entire stream is one String value | Raw bytes, no framing |
| `LineAsString` | Each newline-delimited line is a String | One line per row |
| `JSONEachRow` | Each JSON object is a row | JSON-encoded strings (with escaping) |
| `TabSeparated` | Tab-delimited rows | Tab-delimited rows with backslash escaping |

## Verifying Round-Trip Integrity

Ensure a binary file survives a round-trip through ClickHouse:

```bash
# Original file MD5
md5sum logo.png
# 7f3d...  logo.png

# Insert
curl -X POST \
  'http://localhost:8123/?query=INSERT+INTO+blob_staging+FORMAT+RawBLOB' \
  --data-binary @logo.png

# Retrieve and check MD5
curl -G 'http://localhost:8123/' \
  --data-urlencode "query=SELECT content FROM blob_staging FORMAT RawBLOB" \
  | md5sum
# 7f3d...  - (stdin)
```

The MD5 values must match.

## Size Limitations

`String` columns in ClickHouse have no formal size limit — they can hold strings of arbitrary length. However, practical limits are governed by available memory and settings like `max_memory_usage`. For very large files:

```sql
-- Check the size of stored blobs
SELECT
    file_name,
    formatReadableSize(length(content)) AS size
FROM file_store
ORDER BY length(content) DESC;
```

For files larger than a few hundred MB, consider storing them in object storage (S3) and keeping only the URL in ClickHouse.

## Compression

Compress blobs before storing to save space:

```bash
# Compress with zstd before inserting
zstd logo.png --stdout | \
  curl -X POST \
  'http://localhost:8123/?query=INSERT+INTO+blob_staging+FORMAT+RawBLOB' \
  --data-binary @-
```

Track compression type in a separate column:

```sql
ALTER TABLE file_store ADD COLUMN compression LowCardinality(String) DEFAULT 'none';
```

## Practical Use Case: Config File Storage

Store application configuration files with versioning:

```sql
CREATE TABLE config_versions
(
    app_name   String,
    version    UInt32,
    config     String,
    created_at DateTime DEFAULT now(),
    created_by String
)
ENGINE = MergeTree()
ORDER BY (app_name, version);
```

```bash
# Store a config file using the staging table approach
curl -X POST \
  'http://localhost:8123/?query=INSERT+INTO+blob_staging+FORMAT+RawBLOB' \
  --data-binary @config.yaml
```

```sql
INSERT INTO config_versions (app_name, version, config, created_by)
SELECT 'myapp', 1, content, 'admin'
FROM blob_staging;

TRUNCATE TABLE blob_staging;
```

## Conclusion

`RawBLOB` is the right format when you need to treat an entire binary payload as a single opaque value. It is simpler than building a custom binary protocol, works naturally with the HTTP interface, and integrates with ClickHouse's full SQL capabilities for metadata queries. For most use cases, combine `RawBLOB` with metadata columns to build a searchable binary store.

**Related Reading:**

- [How to Use LineAsString Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-lineasstring-format/view)
- [How to Export ClickHouse Data to Different File Formats](https://oneuptime.com/blog/post/2026-03-31-clickhouse-export-file-formats/view)
- [How to Import Data from S3 in Various Formats in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-import-from-s3/view)

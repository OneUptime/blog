# How to Use MEDIUMBLOB Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Database, Data Type, Binary, Storage

Description: Learn how to use MEDIUMBLOB in MySQL to store binary data up to 16 MB, with examples for files, documents, and performance considerations.

---

## What Is the MEDIUMBLOB Data Type

`MEDIUMBLOB` is a binary large object type that stores up to 16,777,215 bytes (16 MB) of binary data. It fills the gap between `BLOB` (64 KB) and `LONGBLOB` (4 GB) in MySQL's BLOB family.

Like all BLOB types, `MEDIUMBLOB` data is stored off-page in InnoDB (when using the default DYNAMIC row format). BLOB columns contribute only 9 to 12 bytes toward the 65,535-byte per-row limit because their contents are stored separately from the rest of the row.

## Declaring a MEDIUMBLOB Column

```sql
CREATE TABLE uploaded_files (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    filename    VARCHAR(255) NOT NULL,
    mime_type   VARCHAR(100) NOT NULL,
    file_data   MEDIUMBLOB NOT NULL,
    file_size   INT UNSIGNED GENERATED ALWAYS AS (LENGTH(file_data)) STORED,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Inserting Files

```python
import mysql.connector

conn = mysql.connector.connect(host='localhost', user='root', database='mydb')
cursor = conn.cursor()

with open('presentation.pdf', 'rb') as f:
    pdf_bytes = f.read()

cursor.execute(
    """INSERT INTO uploaded_files (filename, mime_type, file_data)
       VALUES (%s, %s, %s)""",
    ('presentation.pdf', 'application/pdf', pdf_bytes)
)
conn.commit()
print(f"Inserted {len(pdf_bytes)} bytes")
```

## Retrieving and Saving Files

```python
cursor.execute(
    "SELECT filename, mime_type, file_data FROM uploaded_files WHERE id = %s",
    (1,)
)
filename, mime_type, file_data = cursor.fetchone()

with open(f'downloaded_{filename}', 'wb') as f:
    f.write(bytes(file_data))
```

## Checking Storage Statistics

```sql
SELECT
    filename,
    mime_type,
    file_size,
    ROUND(file_size / 1024 / 1024, 2) AS size_mb,
    uploaded_at
FROM uploaded_files
ORDER BY file_size DESC
LIMIT 10;
```

## Streaming Large Values

For files near the 16 MB limit, you can write data to disk in chunks. Note that `fetchone()` still loads the full blob into memory; the chunked writing helps manage disk I/O:

```python
cursor.execute(
    "SELECT file_data FROM uploaded_files WHERE id = %s", (1,)
)
# fetchone returns the full blob; for very large blobs use server-side cursors
row = cursor.fetchone()
chunk_size = 65536  # 64 KB chunks

file_data = bytes(row[0])
with open('output.bin', 'wb') as f:
    for i in range(0, len(file_data), chunk_size):
        f.write(file_data[i:i + chunk_size])
```

## max_allowed_packet Setting

Large BLOB inserts require adjusting `max_allowed_packet`:

```sql
-- Check current value
SHOW VARIABLES LIKE 'max_allowed_packet';

-- Set to 20 MB for MEDIUMBLOB support (in my.cnf or SET GLOBAL)
-- [mysqld]
-- max_allowed_packet = 20M
```

```bash
# Or set the client-side max packet size when connecting
mysql -u root -p mydb --max_allowed_packet=20M
```

## When to Use MEDIUMBLOB vs External Storage

Store in `MEDIUMBLOB` when:
- Files are small to medium sized (under 5 MB) and need to be transactionally consistent with row data.
- You want to simplify architecture by keeping files in the database.

Use external object storage (S3, GCS) when:
- Files are large or frequently accessed.
- You want CDN delivery, streaming, or version control.
- Database backup size is a concern.

## Summary

`MEDIUMBLOB` is appropriate for storing medium-sized binary files (up to 16 MB) directly in MySQL. Remember to increase `max_allowed_packet` to accommodate large inserts and avoid selecting BLOB columns unless you specifically need the data. For files over a few megabytes that are frequently accessed, external object storage is usually a better architectural choice.

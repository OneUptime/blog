# How to Use LONGBLOB Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Database, Data Type, Binary, Storage

Description: Learn how LONGBLOB stores up to 4 GB of binary data in MySQL, with examples for large file storage and key configuration settings.

---

## What Is the LONGBLOB Data Type

`LONGBLOB` is the largest binary type in MySQL, capable of storing up to 4,294,967,295 bytes (4 GB) of binary data. It is at the top of the BLOB hierarchy: `TINYBLOB`, `BLOB`, `MEDIUMBLOB`, and `LONGBLOB`.

In InnoDB with the default DYNAMIC row format, `LONGBLOB` data is stored off-page with only a 20-byte pointer kept in the row, so it has minimal impact on the main row size.

## Declaring a LONGBLOB Column

```sql
CREATE TABLE video_archive (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(300) NOT NULL,
    video_data  LONGBLOB,
    codec       VARCHAR(50),
    duration_s  INT UNSIGNED,
    archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Critical: max_allowed_packet

Before inserting large BLOBs, you must increase `max_allowed_packet` to match or exceed the intended payload size:

```bash
# In /etc/mysql/mysql.conf.d/mysqld.cnf
# [mysqld]
# max_allowed_packet = 1G
```

```sql
-- Check the current value, then set at the global level
SHOW VARIABLES LIKE 'max_allowed_packet';

SET GLOBAL max_allowed_packet = 1073741824;  -- 1 GB
```

## Inserting Large Binary Data

```python
import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='root',
    database='media_db'
)
cursor = conn.cursor()

with open('video_clip.mp4', 'rb') as f:
    video_bytes = f.read()

cursor.execute(
    """INSERT INTO video_archive (title, video_data, codec, duration_s)
       VALUES (%s, %s, %s, %s)""",
    ('Demo Video', video_bytes, 'h264', 120)
)
conn.commit()
print(f"Stored {len(video_bytes):,} bytes")
```

## Retrieving and Writing Back

```python
cursor.execute(
    "SELECT title, video_data FROM video_archive WHERE id = %s", (1,)
)
title, video_data = cursor.fetchone()

output_path = f'{title.replace(" ", "_")}.mp4'
with open(output_path, 'wb') as f:
    f.write(bytes(video_data))
print(f"Saved to {output_path}")
```

## Avoiding Full-Scan Problems

Never use `SELECT *` on tables with `LONGBLOB` columns in a loop. Fetch metadata first, then retrieve the BLOB only when needed:

```sql
-- Good: metadata-only query
SELECT id, title, codec, duration_s, LENGTH(video_data) AS size_bytes, archived_at
FROM video_archive
ORDER BY archived_at DESC;

-- Good: targeted BLOB retrieval
SELECT video_data FROM video_archive WHERE id = 42;
```

## Backup Considerations

Large `LONGBLOB` columns make `mysqldump` output enormous. Options to manage this:

```bash
# Exclude specific tables with large BLOBs
mysqldump mydb --ignore-table=mydb.video_archive > mydb_no_blobs.sql

# Dump just the BLOB table separately with extended inserts disabled
mysqldump mydb video_archive --skip-extended-insert > video_archive.sql
```

## When to Use LONGBLOB vs External Storage

| Scenario | LONGBLOB | External Storage |
|---|---|---|
| Files < 1 MB, transactional | Good fit | Overhead not worth it |
| Files 1-100 MB | Possible but expensive | Preferred |
| Files > 100 MB | Avoid | Required |
| CDN / streaming needed | No | Yes |
| Backup simplicity desired | Yes | No |

## Summary

`LONGBLOB` can store up to 4 GB of binary data in a single column, but this capability comes with real costs in backup size, memory, and network transfer. It is best reserved for archival use cases where transactional consistency with other row data is critical. For most production workloads involving large files, external object storage paired with a URL reference in MySQL is a more scalable architecture.

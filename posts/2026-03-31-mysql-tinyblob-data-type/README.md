# How to Use TINYBLOB Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Database, Data Type, Binary, Storage

Description: Learn how TINYBLOB works in MySQL for storing small binary objects up to 255 bytes, with examples and comparison to VARBINARY.

---

## What Is the TINYBLOB Data Type

`TINYBLOB` is the smallest binary large object (BLOB) type in MySQL. It stores up to 255 bytes of binary data. Like all BLOB types, `TINYBLOB` stores its contents separately from the rest of the row and only contributes 9 bytes toward the 65,535-byte row-size limit.

The BLOB family: `TINYBLOB` (255 bytes), `BLOB` (64 KB), `MEDIUMBLOB` (16 MB), `LONGBLOB` (4 GB).

## Declaring a TINYBLOB Column

```sql
CREATE TABLE avatars_small (
    user_id    INT UNSIGNED PRIMARY KEY,
    thumbnail  TINYBLOB,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Inserting TINYBLOB Data

```sql
-- Insert from hex literal (a small PNG header, for example)
INSERT INTO avatars_small (user_id, thumbnail)
VALUES (1, 0x89504E470D0A1A0A0000000D49484452);

-- Insert from application (Python example)
```

```python
import mysql.connector

conn = mysql.connector.connect(host='localhost', user='root', database='mydb')
cursor = conn.cursor()

with open('thumbnail_16x16.png', 'rb') as f:
    image_data = f.read()  # Must be <= 255 bytes

cursor.execute(
    "INSERT INTO avatars_small (user_id, thumbnail) VALUES (%s, %s)",
    (1, image_data)
)
conn.commit()
```

## Retrieving TINYBLOB Data

```sql
-- Display as hex
SELECT user_id, HEX(thumbnail) AS hex_data, LENGTH(thumbnail) AS bytes
FROM avatars_small;
```

```python
cursor.execute("SELECT user_id, thumbnail FROM avatars_small WHERE user_id = %s", (1,))
row = cursor.fetchone()
user_id, thumbnail_bytes = row

with open('retrieved_thumb.png', 'wb') as f:
    f.write(bytes(thumbnail_bytes))
```

## TINYBLOB vs VARBINARY(255)

| Feature | TINYBLOB | VARBINARY(255) |
|---|---|---|
| Max size | 255 bytes | 255 bytes |
| Storage location | Off-page | In-row |
| Default value | Expression only (MySQL 8.0.13+) | Allowed |
| Row-size contribution | Minimal (pointer) | Full value size |
| Index support | Prefix only | Full or prefix |

For 255-byte binary data that fits easily within the row limit, `VARBINARY(255)` is often more convenient because it can have defaults and is indexed directly.

## When to Use TINYBLOB

Use `TINYBLOB` when:
- Storing very small binary objects like tiny icons or short cryptographic tokens.
- The table already has many large columns and you want to avoid row-size pressure.
- You are working with an existing schema that uses the BLOB family consistently.

## Summary

`TINYBLOB` stores up to 255 bytes of binary data off-page, making it functionally equivalent in size to `VARBINARY(255)` but with BLOB semantics. In most new designs, `VARBINARY(255)` is preferred for small binary fields due to its support for default values and in-row storage efficiency. Use `TINYBLOB` when you need consistent BLOB-family semantics or are extending an existing BLOB-based schema.

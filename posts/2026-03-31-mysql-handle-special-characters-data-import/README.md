# How to Handle Special Characters During Data Import in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Character Encoding, Import, UTF-8, Data Quality

Description: Learn how to handle special characters, Unicode, and encoding issues when importing data into MySQL to prevent corruption and collation errors.

---

## Introduction

Special characters - accented letters, emoji, Unicode symbols, and non-ASCII text - are common in real-world datasets. Importing them incorrectly causes garbled data, `Incorrect string value` errors, or silent truncation. This guide covers how to configure MySQL and your import process to handle these characters correctly.

## Ensure the Database Uses utf8mb4

MySQL's `utf8` charset is limited to 3 bytes and cannot store emoji or many Unicode characters. Always use `utf8mb4`:

```sql
CREATE DATABASE mydb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE contacts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) CHARACTER SET utf8mb4,
  bio TEXT CHARACTER SET utf8mb4
);
```

## Specifying Character Set in LOAD DATA INFILE

Tell MySQL the character set of the source file using `CHARACTER SET`:

```sql
LOAD DATA INFILE '/tmp/contacts.csv'
INTO TABLE contacts
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
```

## Checking File Encoding Before Import

Verify the file's encoding before importing:

```bash
file -i contacts.csv
# Expected: text/plain; charset=utf-8

# Check for BOM (Byte Order Mark)
hexdump -C contacts.csv | head -2
```

If the file has a UTF-8 BOM, strip it first:

```bash
sed -i 's/^\xEF\xBB\xBF//' contacts.csv
```

## Converting Encoding with iconv

If the source file is Latin-1 (ISO-8859-1), convert it to UTF-8 first:

```bash
iconv -f ISO-8859-1 -t UTF-8 contacts_latin1.csv > contacts_utf8.csv
```

Then import the converted file:

```bash
mysql --default-character-set=utf8mb4 -u root -p mydb
```

```sql
LOAD DATA INFILE '/tmp/contacts_utf8.csv'
INTO TABLE contacts
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
```

## Handling Backslash Escapes

MySQL's `LOAD DATA INFILE` treats backslash as an escape character by default. If your data contains literal backslashes, disable escaping:

```sql
LOAD DATA INFILE '/tmp/paths.csv'
INTO TABLE file_paths
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
ESCAPED BY ''
LINES TERMINATED BY '\n'
IGNORE 1 ROWS;
```

## Using Python for Encoding-Aware Import

When you need full control over encoding detection and conversion:

```python
import chardet
import mysql.connector

# Detect file encoding
with open('contacts.csv', 'rb') as f:
    raw = f.read()
    detected = chardet.detect(raw)
    encoding = detected['encoding']
    print(f"Detected encoding: {encoding}")

conn = mysql.connector.connect(
    host='localhost', user='root',
    password='password', database='mydb',
    charset='utf8mb4'
)
cursor = conn.cursor()

with open('contacts.csv', 'r', encoding=encoding, errors='replace') as f:
    next(f)  # skip header
    for line in f:
        parts = line.rstrip('\n').split(',')
        cursor.execute(
            "INSERT INTO contacts (name, bio) VALUES (%s, %s)",
            (parts[0], parts[1])
        )

conn.commit()
cursor.close()
conn.close()
```

## Fixing Existing Garbled Data

If data was already imported with wrong encoding, first inspect the stored bytes:

```sql
-- Check the corrupted value
SELECT HEX(name) FROM contacts WHERE id = 1;
```

The most common case is UTF-8 data stored in a `latin1` column where the raw bytes are correct but the character set label is wrong. Fix this by converting through `BINARY` to strip the incorrect character set metadata and reinterpret the bytes as `utf8mb4`:

```sql
ALTER TABLE contacts MODIFY name VARCHAR(200) CHARACTER SET binary;
ALTER TABLE contacts MODIFY name VARCHAR(200) CHARACTER SET utf8mb4;

ALTER TABLE contacts MODIFY bio TEXT CHARACTER SET binary;
ALTER TABLE contacts MODIFY bio TEXT CHARACTER SET utf8mb4;
```

Note: `ALTER TABLE ... CONVERT TO CHARACTER SET utf8mb4` re-encodes data from the current character set, which will not fix garbled data — it only helps when the data is correctly stored in a different character set and you want to change it.

## Summary

The most important rule for special character imports is to use `utf8mb4` for both the database schema and the `LOAD DATA INFILE` `CHARACTER SET` clause. Always verify file encoding before importing, strip BOMs from UTF-8 files when present, and use `iconv` to convert from legacy encodings. For maximum control, use Python with explicit encoding detection.

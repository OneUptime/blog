# How to Use HEX() and UNHEX() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, String Function, Encoding, Database

Description: Learn how to use MySQL HEX() to convert values to hexadecimal strings and UNHEX() to decode hex strings back to binary or text.

---

## Overview

`HEX()` and `UNHEX()` are a pair of MySQL functions for converting between hexadecimal representations and their raw binary or string equivalents. They are commonly used for encoding binary data, storing checksums, working with UUID values, and debugging byte-level data.

---

## HEX() Function

`HEX()` converts a string or numeric value to its hexadecimal representation.

**Syntax:**

```sql
HEX(str)
HEX(N)
```

- When given a **string**, each character's byte value is converted to two hexadecimal digits.
- When given a **number**, it converts the integer to its hex equivalent.
- Returns `NULL` if the argument is `NULL`.

### String to Hex

```sql
SELECT HEX('MySQL');
-- Returns: '4D7953514C'

SELECT HEX('A');
-- Returns: '41'

SELECT HEX('Hello');
-- Returns: '48656C6C6F'
```

### Number to Hex

```sql
SELECT HEX(255);
-- Returns: 'FF'

SELECT HEX(256);
-- Returns: '100'

SELECT HEX(0);
-- Returns: '0'

SELECT HEX(16777215);
-- Returns: 'FFFFFF'
```

---

## UNHEX() Function

`UNHEX()` is the inverse of `HEX()`. It takes a hexadecimal string and returns the corresponding binary string (each pair of hex digits becomes one byte).

**Syntax:**

```sql
UNHEX(str)
```

- `str` must contain an even number of valid hex characters (`0-9`, `A-F`, `a-f`).
- Returns `NULL` if `str` contains an invalid hex character or has an odd length.
- Returns `NULL` if `str` is `NULL`.

### Basic Examples

```sql
SELECT UNHEX('4D7953514C');
-- Returns: 'MySQL'

SELECT UNHEX('48656C6C6F');
-- Returns: 'Hello'

SELECT UNHEX('41');
-- Returns: 'A'

SELECT HEX(UNHEX('4D7953514C'));
-- Returns: '4D7953514C'  (round-trip)

SELECT UNHEX('ZZ');
-- Returns: NULL  (invalid hex)

SELECT UNHEX('ABC');
-- Returns: NULL  (odd number of characters)
```

---

## How HEX() and UNHEX() Work

```mermaid
flowchart LR
    A["String 'MySQL'"] -->|HEX()| B["'4D7953514C'"]
    B -->|UNHEX()| C["String 'MySQL'"]

    D["Integer 255"] -->|HEX()| E["'FF'"]
    E -->|CONV() or arithmetic| F["Integer 255"]
```

---

## Storing Binary Data as Hex

HEX encoding is useful for storing binary data like images, checksums, or tokens in a readable text format:

```sql
CREATE TABLE file_hashes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255),
    md5_hash CHAR(32)
);

-- Store MD5 hash as hex string
INSERT INTO file_hashes (filename, md5_hash)
VALUES ('document.pdf', MD5('document content here'));

SELECT filename, md5_hash FROM file_hashes;
```

---

## UUID Storage Using HEX() and UNHEX()

Storing UUIDs as 16-byte `BINARY(16)` instead of `CHAR(36)` saves space and improves index performance:

```sql
CREATE TABLE sessions (
    id BINARY(16) PRIMARY KEY,
    user_id INT,
    created_at DATETIME
);

-- Store UUID in compact binary form
INSERT INTO sessions (id, user_id, created_at)
VALUES (UNHEX(REPLACE(UUID(), '-', '')), 42, NOW());

-- Retrieve UUID in readable form
SELECT HEX(id) AS session_id, user_id, created_at
FROM sessions;
```

---

## Encoding Special Characters

```sql
-- Check byte values of a UTF-8 string
SELECT HEX('cafe');
-- Depending on charset, may show multi-byte encoding for accented characters

SELECT HEX('A B');
-- Returns: '412042'  (41=A, 20=space, 42=B)
```

---

## Using UNHEX() for Binary Column Lookups

```sql
-- Search by binary UUID stored as BINARY(16)
SELECT user_id
FROM sessions
WHERE id = UNHEX('6ccd780c2b76a80ce3c84dbc62a09d73');
```

---

## HEX() on BLOB Columns

```sql
CREATE TABLE attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    data BLOB
);

INSERT INTO attachments (name, data) VALUES ('test.bin', UNHEX('DEADBEEF'));

-- View stored binary data as hex
SELECT name, HEX(data) AS hex_data FROM attachments;
```

---

## Practical: Checksums and Fingerprints

```sql
-- Generate a hex fingerprint of a row
SELECT
    id,
    SHA2(CONCAT(first_name, last_name, email), 256) AS row_fingerprint
FROM customers
LIMIT 5;
```

---

## UNHEX() Validation

Always validate input before calling `UNHEX()` on user-supplied data:

```sql
-- Only process valid hex strings of length 32 (MD5)
SELECT
    CASE
        WHEN LENGTH(input_hash) = 32 AND input_hash REGEXP '^[0-9A-Fa-f]+$'
        THEN UNHEX(input_hash)
        ELSE NULL
    END AS binary_hash
FROM input_table;
```

---

## HEX() vs CONV() vs BIN()

| Function    | Converts To            | Input Accepts     |
|-------------|------------------------|-------------------|
| `HEX(n)`    | Hexadecimal string     | Integer or string |
| `BIN(n)`    | Binary string          | Integer only      |
| `OCT(n)`    | Octal string           | Integer only      |
| `CONV(n,a,b)` | Base `a` to base `b` | Integer string    |

```sql
SELECT HEX(255);    -- 'FF'
SELECT BIN(255);    -- '11111111'
SELECT OCT(255);    -- '377'
SELECT CONV(255, 10, 16);  -- 'FF'
```

---

## Summary

`HEX()` and `UNHEX()` provide efficient encoding and decoding between binary data and hexadecimal string representation in MySQL. Use `HEX()` to inspect binary columns, encode UUIDs for compact storage, or generate readable fingerprints. Use `UNHEX()` to decode hex literals back into binary for storage or lookups. Always validate hex string format before passing user input to `UNHEX()` to avoid unexpected `NULL` results.

# How to Convert Between Binary and Text in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Binary, Text, Conversion, HEX

Description: Learn how to convert between binary and text data in MySQL using HEX(), UNHEX(), BINARY(), CAST(), and character set conversion functions.

---

## Introduction

Converting between binary and text representations is a common need in MySQL for storing binary data in readable form, encoding binary keys, working with hashes stored as hex strings, and handling character set conversions. MySQL provides `HEX()`, `UNHEX()`, `BINARY()`, and `CAST()` for these conversions.

## HEX() - Binary to Hexadecimal String

`HEX()` converts a string or number to its hexadecimal representation:

```sql
-- String to hex
SELECT HEX('Hello');
-- Returns: 48656C6C6F

-- Binary data to hex (e.g., from RANDOM_BYTES)
SELECT HEX(RANDOM_BYTES(8));
-- Returns: A3F72B8E1C9D4052 (example)

-- Number to hex
SELECT HEX(255);
-- Returns: FF

SELECT HEX(65536);
-- Returns: 10000
```

## UNHEX() - Hexadecimal String to Binary

`UNHEX()` is the inverse of `HEX()` - it converts a hex string back to binary:

```sql
SELECT UNHEX('48656C6C6F');
-- Returns: Hello (binary representation of 'Hello')

-- Convert back to readable string
SELECT CONVERT(UNHEX('48656C6C6F') USING utf8mb4);
-- Returns: Hello

-- Round trip
SELECT UNHEX(HEX('MySQL is great'));
-- Returns: MySQL is great (as binary)
```

## Storing Binary Data as Hex

For storing binary values (like hashes) as readable hex strings:

```sql
CREATE TABLE token_store (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token_hex CHAR(64) NOT NULL,  -- SHA-256 hex string
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Store SHA-256 hash as hex
INSERT INTO token_store (token_hex)
VALUES (SHA2('some data', 256));

-- Store random bytes as hex
INSERT INTO token_store (token_hex)
VALUES (HEX(RANDOM_BYTES(32)));

-- Look up by hex value
SELECT * FROM token_store WHERE token_hex = SHA2('some data', 256);
```

## Storing Hex as Binary for Efficiency

`CHAR(64)` for a SHA-256 hash uses 64 bytes. Store as `BINARY(32)` to halve storage:

```sql
CREATE TABLE compact_hashes (
  id INT PRIMARY KEY,
  sha256 BINARY(32) NOT NULL
);

-- Store as binary
INSERT INTO compact_hashes VALUES (1, UNHEX(SHA2('data', 256)));

-- Read back as hex
SELECT id, HEX(sha256) AS hex_hash FROM compact_hashes;

-- Query by hex string
SELECT * FROM compact_hashes
WHERE sha256 = UNHEX('3a6eb0790f39ac87c94f3856b2dd2c5d110e6811602261a9a923d3bb23adc8b7');
```

## BINARY() / CAST AS BINARY

Convert a text string to a binary string (changes comparison behavior to be case-sensitive and byte-by-byte):

```sql
-- Case-insensitive comparison (default for utf8mb4_general_ci)
SELECT 'Hello' = 'hello';    -- Returns: 1 (true)

-- Case-sensitive comparison using BINARY
SELECT BINARY 'Hello' = 'hello';       -- Returns: 0 (false)
SELECT CAST('Hello' AS BINARY) = CAST('hello' AS BINARY);  -- Returns: 0

-- BINARY type cast
SELECT BINARY 'MySQL';
-- Returns the string with binary collation
```

## Character Set Conversion

Convert between character sets using `CONVERT()`:

```sql
-- Convert from latin1 to utf8mb4
SELECT CONVERT(latin1_column USING utf8mb4) FROM legacy_table;

-- Convert from utf8mb4 to ascii (may lose characters)
SELECT CONVERT('Hello World' USING ascii);
-- Returns: Hello World

-- Non-ASCII becomes ?
SELECT CONVERT('Café café' USING ascii);
-- Returns: Caf? caf?
```

## Converting Binary Column to Text

When a binary column contains text data:

```sql
-- BLOB contains text - convert to string
SELECT CONVERT(binary_column USING utf8mb4) FROM files WHERE id = 1;

-- Or use CAST
SELECT CAST(binary_column AS CHAR CHARACTER SET utf8mb4) FROM files WHERE id = 1;
```

## Practical Example: UUID Storage

UUIDs as BINARY(16) save space vs CHAR(36):

```sql
CREATE TABLE events (
  id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
  name VARCHAR(100)
);

-- Insert
INSERT INTO events (name) VALUES ('user_login');

-- Read UUID as string
SELECT BIN_TO_UUID(id) AS uuid, name FROM events;

-- Manual hex approach
SELECT HEX(id) AS id_hex, name FROM events;
```

## Summary

MySQL's binary-text conversion functions serve different purposes: `HEX()` makes binary data human-readable, `UNHEX()` converts hex strings back to binary for compact storage, `BINARY` keyword or `CAST(... AS BINARY)` enables byte-by-byte comparison, and `CONVERT(... USING charset)` handles character encoding changes. Use `BINARY(n)` columns with `UNHEX()` to store hash values at half the space of hex string columns.

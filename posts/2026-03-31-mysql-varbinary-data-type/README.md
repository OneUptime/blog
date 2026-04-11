# How to Use VARBINARY Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Database, Data Type, Binary, Storage

Description: Learn how VARBINARY works in MySQL for storing variable-length binary data, with practical examples for hashes, images, and encrypted values.

---

## What Is the VARBINARY Data Type

`VARBINARY(n)` stores variable-length binary strings up to `n` bytes. It is the binary equivalent of `VARCHAR`: it stores only as many bytes as the value requires, plus a 1 or 2 byte length prefix.

The maximum length is 65,535 bytes per column (subject to the overall row limit).

## Declaring a VARBINARY Column

```sql
CREATE TABLE file_chunks (
    id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    chunk_no INT NOT NULL,
    data     VARBINARY(65535),
    KEY idx_file (filename, chunk_no)
);
```

## Inserting Binary Data

```sql
-- Storing raw bytes using hex literals
INSERT INTO file_chunks (filename, chunk_no, data)
VALUES ('image.png', 1, 0x89504E470D0A1A0A);

-- Storing encrypted data
INSERT INTO file_chunks (filename, chunk_no, data)
VALUES ('secret.bin', 1, AES_ENCRYPT('sensitive data', 'encryption_key_32bytes__________'));
```

## Retrieving VARBINARY Data

```sql
-- Display as hex string
SELECT filename, chunk_no, HEX(data) AS hex_data FROM file_chunks;

-- Get byte length
SELECT filename, LENGTH(data) AS bytes FROM file_chunks;

-- Decrypt AES-encrypted data
SELECT filename, AES_DECRYPT(data, 'encryption_key_32bytes__________') AS plaintext
FROM file_chunks
WHERE filename = 'secret.bin';
```

## VARBINARY vs VARCHAR

| Feature | VARBINARY(n) | VARCHAR(n) |
|---|---|---|
| Content | Raw bytes | Characters |
| Comparison | Byte-by-byte | Collation-aware |
| Charset | None (binary) | Table/column charset |
| Case-sensitive | Always | Depends on collation |
| Trailing bytes | Preserved | Preserved; ignored in PAD SPACE comparisons |

## Comparing VARBINARY Values

```sql
CREATE TABLE hashes (digest VARBINARY(64));
INSERT INTO hashes VALUES
    (UNHEX(SHA2('apple', 256))),
    (UNHEX(SHA2('Apple', 256)));

-- Different: binary comparison is case-sensitive
SELECT HEX(digest) FROM hashes;
```

## Storing Variable-Length Encrypted Values

AES encryption output size depends on the padding mode, making `VARBINARY` a natural fit:

```sql
CREATE TABLE encrypted_fields (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    encrypted_ssn  VARBINARY(255)
);

INSERT INTO encrypted_fields (encrypted_ssn)
VALUES (AES_ENCRYPT('123-45-6789', UNHEX(SHA2('passphrase', 256))));

SELECT AES_DECRYPT(encrypted_ssn, UNHEX(SHA2('passphrase', 256))) AS ssn
FROM encrypted_fields
WHERE id = 1;
```

## Indexing VARBINARY

`VARBINARY` columns can be indexed directly for short lengths. For longer values, use prefix indexes:

```sql
CREATE INDEX idx_digest ON hashes (digest);

-- Prefix index for longer columns
ALTER TABLE file_chunks ADD INDEX idx_data_prefix (data(16));
```

## Summary

`VARBINARY` is the preferred binary type when the data length varies - for encrypted values, cryptographic digests of varying algorithm outputs, or small binary payloads. It preserves every byte exactly, compares byte-by-byte without charset rules, and uses only the storage needed. For fixed-size binary data like SHA-256 hashes or UUIDs, prefer `BINARY(n)` instead.

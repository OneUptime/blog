# How to Use SHA2() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SHA2, Hash, Function, Security

Description: Learn how to use MySQL's SHA2() function to compute secure SHA-256, SHA-384, and SHA-512 hash digests for data integrity and security applications.

---

## Introduction

The `SHA2()` function in MySQL computes SHA-2 family hash digests, supporting SHA-224, SHA-256, SHA-384, and SHA-512 algorithms. Unlike MD5 and SHA1, SHA-2 variants are currently considered cryptographically secure and are suitable for data integrity verification, digital signatures, and HMAC construction. MySQL has supported `SHA2()` since version 5.5.

## Basic Syntax

```sql
SHA2(str, hash_length)
```

- `str` - the input string to hash
- `hash_length` - the desired output bit length: `224`, `256`, `384`, `512`, or `0` (equivalent to 256)
- Returns a lowercase hexadecimal string
- Returns `NULL` if either argument is `NULL` or `hash_length` is not a valid value

## Output Lengths by Algorithm

| Algorithm | hash_length | Output Characters |
|-----------|-------------|-------------------|
| SHA-224   | 224         | 56                |
| SHA-256   | 256         | 64                |
| SHA-384   | 384         | 96                |
| SHA-256   | 0           | 64                |
| SHA-512   | 512         | 128               |

## Basic Examples

```sql
SELECT SHA2('hello', 256);
-- Returns: 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824

SELECT SHA2('hello', 512);
-- Returns: 9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043

SELECT SHA2('hello', 224);
-- Returns: ea09ae9cc6768c50fcee903ed054556e5bfc8347907f12598aa24193

SELECT SHA2(NULL, 256);
-- Returns: NULL

SELECT SHA2('data', 999);
-- Returns: NULL  (invalid hash_length)
```

## Using SHA2() for Data Integrity

Store a SHA-256 hash alongside critical records to detect tampering:

```sql
CREATE TABLE contracts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content TEXT NOT NULL,
  sha256_hash CHAR(64) NOT NULL,
  signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO contracts (content, sha256_hash)
VALUES (
  'Service Agreement v1.0...',
  SHA2('Service Agreement v1.0...', 256)
);

-- Verify integrity
SELECT id, SHA2(content, 256) = sha256_hash AS is_valid FROM contracts;
```

## Using SHA2() as a Lookup Key

SHA-256 hashes make excellent content-addressed storage keys:

```sql
CREATE TABLE content_store (
  sha256_key CHAR(64) PRIMARY KEY,
  data LONGBLOB NOT NULL,
  size INT UNSIGNED NOT NULL
);

INSERT INTO content_store (sha256_key, data, size)
SELECT SHA2(data, 256), data, LENGTH(data)
FROM raw_uploads;
```

## Storing as Binary for Efficiency

CHAR(64) uses 64 bytes. Store SHA-256 as BINARY(32) to halve the storage:

```sql
CREATE TABLE file_hashes (
  file_id INT PRIMARY KEY,
  sha256 BINARY(32) NOT NULL
);

INSERT INTO file_hashes VALUES (1, UNHEX(SHA2('file content', 256)));

-- Retrieve as hex
SELECT file_id, HEX(sha256) AS hash FROM file_hashes;
```

## Comparing Hash Lengths for Security Decisions

```sql
SELECT
  LENGTH(SHA2('data', 224)) AS sha224_chars,  -- 56
  LENGTH(SHA2('data', 256)) AS sha256_chars,  -- 64
  LENGTH(SHA2('data', 384)) AS sha384_chars,  -- 96
  LENGTH(SHA2('data', 512)) AS sha512_chars;  -- 128
```

For most applications, SHA-256 (256-bit) provides sufficient security. Use SHA-512 for long-term high-security applications.

## HMAC with SHA2()

MySQL does not have a built-in HMAC function. HMAC should be implemented in your application layer. For simple keyed hashing (not true HMAC):

```sql
SELECT SHA2(CONCAT('secret_key', 'message_to_sign'), 256) AS keyed_hash;
```

Note: This is not true HMAC. Use application-level HMAC with `hmac.new()` in Python or equivalent for proper HMAC.

## Summary

`SHA2()` is MySQL's most secure built-in hash function, supporting SHA-224, SHA-256, SHA-384, and SHA-512. Use SHA-256 or higher for data integrity verification, content-addressed storage, and any security-relevant hashing. Store digests as `BINARY(32)` for SHA-256 to minimize storage overhead. Avoid `MD5()` and `SHA1()` for security-sensitive applications as both are cryptographically broken.

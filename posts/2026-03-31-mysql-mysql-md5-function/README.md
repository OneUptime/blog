# How to Use MD5() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MD5, Hash, Function, Security

Description: Learn how to use MySQL's MD5() function to compute MD5 hash digests of strings, with examples for checksums, deduplication, and data integrity checks.

---

## Introduction

The `MD5()` function in MySQL computes the MD5 (Message Digest 5) hash of a string and returns a 32-character hexadecimal string. While MD5 is no longer considered cryptographically secure for password hashing, it remains useful for data integrity checks, checksums, and deduplication where security is not a concern.

## Basic Syntax

```sql
MD5(str)
```

- `str` - the string to hash
- Returns a 32-character hex string, or `NULL` if the argument is `NULL`

## Basic Examples

```sql
SELECT MD5('hello');
-- Returns: 5d41402abc4b2a76b9719d911017c592

SELECT MD5('MySQL');
-- Returns: 62a004b95946bb97541afa471dcca73a

SELECT MD5('');
-- Returns: d41d8cd98f00b204e9800998ecf8427e

SELECT MD5(NULL);
-- Returns: NULL
```

## Using MD5() for Data Deduplication

MD5 is useful for finding duplicate records when comparing large text fields:

```sql
-- Find duplicate rows by hashing content columns
SELECT MD5(CONCAT(first_name, last_name, email)) AS row_hash, COUNT(*) AS cnt
FROM customers
GROUP BY row_hash
HAVING cnt > 1;
```

## Storing MD5 Checksums

Use MD5 to store a checksum alongside a record to detect changes:

```sql
CREATE TABLE documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content LONGTEXT NOT NULL,
  content_hash CHAR(32) NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO documents (content, content_hash)
VALUES ('Document content here', MD5('Document content here'));
```

To verify integrity on read:

```sql
SELECT
  id,
  content_hash = MD5(content) AS is_intact
FROM documents;
```

## Using MD5() in WHERE Clauses

When working with large text columns, compare hashes instead of full text for performance:

```sql
SELECT id, filename
FROM files
WHERE MD5(filename) = MD5('report_2026_Q1.pdf');
```

Note: This prevents index use on `filename`. If the column is indexed, a direct comparison is faster:

```sql
SELECT id FROM files WHERE filename = 'report_2026_Q1.pdf';
```

## Generating Short Unique Tokens

MD5 can generate short tokens for non-security purposes like cache keys:

```sql
SELECT LEFT(MD5(CONCAT(user_id, NOW())), 8) AS short_token;
```

## Unhex the Hash for Binary Storage

Store the MD5 hash as binary (16 bytes) instead of a 32-char string to save space:

```sql
CREATE TABLE file_checksums (
  file_id INT PRIMARY KEY,
  checksum BINARY(16) NOT NULL
);

INSERT INTO file_checksums VALUES (1, UNHEX(MD5('file content here')));

-- Verify:
SELECT file_id, HEX(checksum) AS checksum_hex FROM file_checksums;
```

## Why Not Use MD5() for Passwords

MD5 is cryptographically broken and should never be used for password storage. Use the `caching_sha2_password` authentication plugin or application-level hashing with bcrypt/Argon2 instead:

```python
# Use bcrypt in application code, not MD5
import bcrypt
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
```

## Summary

MySQL's `MD5()` function generates 32-character hexadecimal hash digests suitable for checksums, deduplication, and data integrity verification. Avoid using it for password hashing or any security-sensitive application since MD5 is cryptographically weak. For security-critical hashing in MySQL, use `SHA2()` with a 256-bit or larger digest size.

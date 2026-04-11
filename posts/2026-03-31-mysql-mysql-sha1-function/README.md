# How to Use SHA1() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SHA1, Hash, Function, Security

Description: Learn how to use MySQL's SHA1() function to compute SHA-1 hash digests, with examples for checksums and data integrity verification.

---

## Introduction

The `SHA1()` function (also aliased as `SHA()`) in MySQL computes the SHA-1 hash of a string and returns a 40-character hexadecimal string. SHA-1 produces a 160-bit digest, making it slightly more collision-resistant than MD5's 128-bit output. Like MD5, SHA-1 is no longer recommended for security-critical uses but remains useful for non-security checksums and legacy applications.

## Basic Syntax

```sql
SHA1(str)
SHA(str)   -- alias
```

- `str` - the input string to hash
- Returns a 40-character lowercase hexadecimal string
- Returns `NULL` if `str` is `NULL`

## Basic Examples

```sql
SELECT SHA1('hello');
-- Returns: aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d

SELECT SHA('MySQL');
-- Returns: deaa0c393a6613972aaccbf1fecfdad67aa21e88

SELECT SHA1('');
-- Returns: da39a3ee5e6b4b0d3255bfef95601890afd80709

SELECT SHA1(NULL);
-- Returns: NULL
```

## Comparing MD5 vs SHA1 Output Length

```sql
SELECT
  MD5('test') AS md5_hash,
  LENGTH(MD5('test')) AS md5_len,
  SHA1('test') AS sha1_hash,
  LENGTH(SHA1('test')) AS sha1_len;
```

Result:

```text
md5_hash                           md5_len  sha1_hash                                  sha1_len
098f6bcd4621d373cade4e832627b4f6   32       a94a8fe5ccb19ba61c4c0873d391e987982fbbd3   40
```

## Using SHA1() for File Checksums

Store SHA-1 checksums for uploaded files to detect corruption or tampering:

```sql
CREATE TABLE uploaded_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  content LONGBLOB NOT NULL,
  sha1_checksum CHAR(40) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO uploaded_files (filename, content, sha1_checksum)
VALUES ('report.pdf', LOAD_FILE('/tmp/report.pdf'), SHA1(LOAD_FILE('/tmp/report.pdf')));
```

## Verifying Data Integrity

To check if a stored value matches its checksum:

```sql
SELECT
  id,
  filename,
  SHA1(content) = sha1_checksum AS checksum_valid
FROM uploaded_files;
```

## Using SHA1() for Deduplication

```sql
-- Find duplicate content using SHA1
SELECT SHA1(body) AS content_hash, COUNT(*) AS cnt, MIN(id) AS keep_id
FROM articles
GROUP BY SHA1(body)
HAVING cnt > 1;
```

## Storing as Binary for Space Efficiency

SHA-1 can be stored as `BINARY(20)` instead of `CHAR(40)`:

```sql
CREATE TABLE content_hashes (
  id INT PRIMARY KEY,
  sha1_hash BINARY(20) NOT NULL
);

INSERT INTO content_hashes VALUES (1, UNHEX(SHA1('some content')));

SELECT id, HEX(sha1_hash) FROM content_hashes;
```

## SHA1() in Git-style Content Addressing

SHA-1 is used by Git to identify commits and blobs. In a custom content-addressable system:

```sql
SELECT SHA1(CONCAT('blob ', LENGTH(content), CHAR(0), content)) AS git_sha
FROM documents
WHERE id = 1;
```

## When to Use SHA1() vs SHA2()

SHA-1 is computationally broken for collision resistance (demonstrated by the SHAttered attack in 2017). Use `SHA2()` with 256-bit or larger output for any security-sensitive use case:

```sql
-- Prefer this for security
SELECT SHA2('sensitive data', 256);

-- OK for non-security checksums
SELECT SHA1('non-sensitive content');
```

## Summary

MySQL's `SHA1()` function produces 40-character SHA-1 hex digests suitable for checksums, deduplication, and data integrity verification in non-security contexts. It provides a slightly longer digest than MD5, reducing accidental collision probability. For security-sensitive applications, always use `SHA2()` with at least 256-bit output, as SHA-1 is cryptographically compromised.

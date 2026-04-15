# How to Use MD5() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Hash Function, MD5, Checksum, Deduplication

Description: Learn how to use MD5() in ClickHouse for data fingerprinting, legacy checksum compatibility, and content-based deduplication.

---

MD5 is a widely used 128-bit cryptographic hash function. While it is no longer considered secure for cryptographic purposes, it remains useful for non-security tasks such as generating checksums, fingerprinting data, and compatibility with legacy systems. In ClickHouse, `MD5(str)` returns a `FixedString(16)` containing the raw binary hash. For a human-readable result, wrap the output with `hex()`.

## Basic Usage

```sql
-- Returns a FixedString(16) binary MD5 hash
SELECT MD5('hello world');

-- Returns a 32-character hex string (the familiar MD5 format)
SELECT hex(MD5('hello world')) AS md5_hex;
```

The output of `hex(MD5(...))` is a 32-character uppercase hexadecimal string. Most command-line tools like `md5sum` produce lowercase hex, so use `lower(hex(MD5(...)))` if you need a case-matched comparison.

## Data Fingerprinting

MD5 is commonly used to generate a fingerprint that uniquely identifies a piece of content. This is useful for detecting whether a file or record has changed.

```sql
-- Fingerprint the content of each document
SELECT
    document_id,
    title,
    hex(MD5(content)) AS content_fingerprint
FROM documents
LIMIT 10;
```

## Legacy Checksum Compatibility

Many older systems use MD5 checksums for data integrity. When ingesting data from such systems, you can recompute and compare the checksum in ClickHouse.

```sql
-- Verify file checksums against expected values
-- Use lower() because most external tools store checksums in lowercase
SELECT
    file_name,
    expected_md5,
    lower(hex(MD5(file_content))) AS computed_md5,
    expected_md5 = lower(hex(MD5(file_content))) AS checksum_valid
FROM file_uploads
LIMIT 20;
```

## Content-Based Deduplication

MD5 can identify duplicate content even when row identifiers differ. Group by the hash to find records with identical content.

```sql
-- Find duplicate log entries by content hash
SELECT
    hex(MD5(log_message)) AS msg_hash,
    count()               AS occurrences,
    min(log_time)         AS first_seen,
    max(log_time)         AS last_seen
FROM application_logs
GROUP BY msg_hash
HAVING occurrences > 1
ORDER BY occurrences DESC
LIMIT 20;
```

## Using MD5 as a Materialized Column

Precomputing MD5 at insert time avoids repeated computation at query time, especially useful when querying large tables.

```sql
CREATE TABLE content_store
(
    id          UInt64,
    content     String,
    inserted_at DateTime,
    content_md5 FixedString(16) MATERIALIZED MD5(content)
)
ENGINE = MergeTree()
ORDER BY (id, inserted_at);

-- Later, query using the precomputed hash
SELECT
    id,
    hex(content_md5) AS md5_hex
FROM content_store
LIMIT 10;
```

## Comparing MD5 to Other Hash Functions

```sql
-- Side-by-side comparison of hash outputs
SELECT
    'sample text'                AS input,
    hex(MD5('sample text'))      AS md5_32chars,
    hex(SHA1('sample text'))     AS sha1_40chars,
    hex(SHA256('sample text'))   AS sha256_64chars;
```

## Detecting Changed Records with MD5

Track changes to rows over time by comparing MD5 hashes of the current and previous snapshots.

```sql
-- Detect which rows changed between two snapshots
SELECT
    a.record_id,
    hex(MD5(a.data)) AS old_hash,
    hex(MD5(b.data)) AS new_hash
FROM snapshot_v1 AS a
JOIN snapshot_v2 AS b ON a.record_id = b.record_id
WHERE MD5(a.data) != MD5(b.data)
LIMIT 20;
```

## Important Notes on MD5

MD5 is not suitable for:
- Password storage (use bcrypt, Argon2, or scrypt externally)
- Digital signatures or certificate verification
- Any context where collision resistance is required

It remains appropriate for:
- Checksums where collision resistance is not a security concern
- Legacy system compatibility
- Content deduplication in analytics pipelines

```sql
-- Example: checking if two strings produce different hashes (they should)
SELECT
    hex(MD5('password123'))  AS hash1,
    hex(MD5('Password123'))  AS hash2,
    MD5('password123') = MD5('Password123') AS same;
```

## Summary

`MD5()` in ClickHouse returns a `FixedString(16)` binary hash. Wrap it with `hex()` to get the standard 32-character hexadecimal representation. It is well suited for data fingerprinting, checksum verification against legacy systems, and content-based deduplication in analytics pipelines. For new applications where security matters, prefer SHA-256 or a modern key derivation function.

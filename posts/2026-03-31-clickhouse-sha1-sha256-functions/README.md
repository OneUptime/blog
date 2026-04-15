# How to Use SHA1(), SHA224(), SHA256() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Hash Function, SHA256, Cryptographic Hash, Data Integrity

Description: Learn how to use SHA1(), SHA224(), and SHA256() in ClickHouse for content integrity checks, data fingerprinting, and secure hash generation.

---

ClickHouse provides three SHA family functions: `SHA1()`, `SHA224()`, and `SHA256()`. Each returns the raw binary hash as a `FixedString`. Use `hex()` to convert the output to a readable hexadecimal string. These functions are appropriate for content integrity verification and data fingerprinting. For password storage, always use a dedicated key derivation function (such as bcrypt or Argon2) outside of ClickHouse.

## Output Sizes

```text
SHA1   -> FixedString(20)  -> hex output: 40 characters
SHA224 -> FixedString(28)  -> hex output: 56 characters
SHA256 -> FixedString(32)  -> hex output: 64 characters
```

## Basic Usage

```sql
-- SHA1: 40-character hex output
SELECT hex(SHA1('hello world')) AS sha1_hex;

-- SHA224: 56-character hex output
SELECT hex(SHA224('hello world')) AS sha224_hex;

-- SHA256: 64-character hex output
SELECT hex(SHA256('hello world')) AS sha256_hex;
```

## Content Integrity Verification

SHA-256 is the standard choice for content integrity in modern systems. Use it to verify that data has not been tampered with.

```sql
-- Compute SHA-256 fingerprints for all files in a table
SELECT
    file_id,
    file_name,
    hex(SHA256(file_content)) AS sha256_fingerprint
FROM uploaded_files
LIMIT 10;

-- Verify integrity by comparing stored and recomputed hashes
SELECT
    file_id,
    stored_hash,
    hex(SHA256(file_content)) AS computed_hash,
    stored_hash = hex(SHA256(file_content)) AS is_valid
FROM uploaded_files
WHERE stored_hash IS NOT NULL
LIMIT 20;
```

## Deduplication Using SHA256

SHA256 produces 256 bits of output, making collisions astronomically unlikely. Use it to deduplicate large content sets.

```sql
-- Find duplicate documents by content hash
SELECT
    hex(SHA256(content)) AS doc_hash,
    count()              AS duplicate_count,
    min(created_at)      AS first_inserted
FROM documents
GROUP BY doc_hash
HAVING duplicate_count > 1
ORDER BY duplicate_count DESC
LIMIT 10;
```

## Comparing SHA1 and SHA256

```sql
-- Compare hash lengths and values
SELECT
    'sample input'                   AS input,
    length(hex(SHA1('sample input')))   AS sha1_length,
    length(hex(SHA256('sample input'))) AS sha256_length,
    hex(SHA1('sample input'))           AS sha1_hex,
    hex(SHA256('sample input'))         AS sha256_hex;
```

## Using SHA256 for API Key Fingerprinting

When storing references to API keys or tokens, store the hash rather than the raw value. This allows you to look up a key by its hash without storing the secret.

```sql
-- Store hashed API key references
CREATE TABLE api_key_log
(
    key_hash    FixedString(32),
    user_id     UInt64,
    used_at     DateTime,
    endpoint    String
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(used_at)
ORDER BY (key_hash, used_at);

-- Insert using SHA256 hash of the key
INSERT INTO api_key_log (key_hash, user_id, used_at, endpoint)
VALUES (SHA256('sk-my-secret-api-key'), 42, now(), '/api/v1/data');
```

## Materialized SHA256 Column

Precompute the hash at insert time to avoid repeated computation during queries.

```sql
CREATE TABLE content_items
(
    item_id      UInt64,
    content      String,
    created_at   DateTime,
    sha256_hash  FixedString(32) MATERIALIZED SHA256(content)
)
ENGINE = MergeTree()
ORDER BY (item_id, created_at);

-- Query the precomputed hash
SELECT
    item_id,
    hex(sha256_hash) AS content_hash
FROM content_items
LIMIT 10;
```

## SHA256 for Data Pipeline Checksums

In ETL pipelines, use SHA256 to checksum batches and detect corruption between stages.

```sql
-- Compute a checksum over all rows in a batch
SELECT
    batch_id,
    count()                                         AS row_count,
    hex(SHA256(arrayStringConcat(groupArray(hex(SHA256(row_data))), ''))) AS batch_checksum
FROM ingest_batch
GROUP BY batch_id
ORDER BY batch_id;
```

## Important Security Notes

SHA1 is no longer considered secure for collision resistance. SHA224 and SHA256 are still considered secure for most applications as of 2026. However, none of these functions are suitable for password storage. Always use a slow key derivation function (bcrypt, Argon2, scrypt) for password hashing.

```sql
-- Use SHA256 for checksums, NOT for passwords
SELECT
    user_id,
    -- This is acceptable for token fingerprinting, NOT password storage
    hex(SHA256(reset_token)) AS token_fingerprint
FROM password_reset_requests
LIMIT 5;
```

## Summary

`SHA1()`, `SHA224()`, and `SHA256()` return binary `FixedString` hashes in ClickHouse. Wrap with `hex()` to get readable output. SHA256 is the recommended choice for new applications requiring content integrity and data fingerprinting. Use SHA1 only when compatibility with older systems requires it. For deduplication at scale, SHA256's 256-bit output makes collisions negligible. Never use these functions for password storage.

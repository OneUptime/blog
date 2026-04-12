# How to Use CRC32() Function in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Hash Function, Database

Description: Learn how MySQL's CRC32() function computes a 32-bit cyclic redundancy check value for a string, useful for checksums, change detection, and data sharding.

---

## What is CRC32()?

`CRC32()` in MySQL computes a 32-bit Cyclic Redundancy Check (CRC) value for a given string. It returns an unsigned 32-bit integer between 0 and 4,294,967,295. CRC32 is not a cryptographic hash - it is a fast, deterministic checksum algorithm designed for error detection, quick equality checks, and consistent numeric hashing of string values.

The syntax is:

```sql
CRC32(expr)
```

`expr` is the string to checksum. The result is always the same for a given input value (deterministic).

## Basic Examples

```sql
SELECT CRC32('hello');
-- Result: 907060870

SELECT CRC32('Hello');
-- Result: 4157704578  (different - case-sensitive)

SELECT CRC32('hello');
-- Result: 907060870  (same input = same output)

SELECT CRC32('');
-- Result: 0
```

Note: `CRC32()` is case-sensitive by default.

## NULL Handling

`CRC32()` returns `NULL` when the input is `NULL`:

```sql
SELECT CRC32(NULL);
-- Result: NULL
```

## Change Detection

Store the checksum of a row's content to detect when it changes:

```sql
ALTER TABLE products ADD COLUMN content_checksum INT UNSIGNED;

UPDATE products
SET content_checksum = CRC32(CONCAT(name, '|', description, '|', price));
```

On subsequent runs, compare checksums to find changed rows:

```sql
SELECT id
FROM products
WHERE content_checksum != CRC32(CONCAT(name, '|', description, '|', price));
```

## Data Integrity Verification

After a bulk import or migration, validate row-level checksums:

```sql
SELECT
  source_id,
  CRC32(CONCAT_WS('|', col1, col2, col3)) AS row_checksum
FROM imported_data;
```

Compare these against pre-computed checksums from the source system to flag discrepancies.

## Consistent Sharding / Partitioning

Use `CRC32()` to deterministically assign rows to shards:

```sql
SELECT
  user_id,
  CRC32(user_id) % 4 AS shard_number
FROM users;
```

This consistently maps each `user_id` to one of 4 shards. Because `CRC32()` is deterministic, the same user always maps to the same shard.

## Deduplication Check

Quickly identify likely duplicate rows by comparing content checksums:

```sql
SELECT
  CRC32(CONCAT(first_name, last_name, email)) AS row_hash,
  COUNT(*) AS occurrences
FROM contacts
GROUP BY row_hash
HAVING occurrences > 1;
```

Note: CRC32 can collide - two different inputs may produce the same checksum. For critical deduplication, verify full row equality after finding matching checksums.

## Using CRC32() for Simple Cache Keys

Generate a numeric key for caching query results:

```sql
SELECT
  CRC32(CONCAT(product_id, ':', user_id, ':', DATE(NOW()))) AS cache_key
FROM personalized_prices;
```

## Combining CRC32() with MOD for Hash-Based Routing

```sql
SELECT
  order_id,
  CRC32(CAST(order_id AS CHAR)) % 8 AS queue_number
FROM orders
WHERE status = 'pending';
```

## CRC32 vs MD5 vs SHA1

| Function | Output    | Speed     | Collisions | Use Case              |
|----------|-----------|-----------|------------|-----------------------|
| CRC32()  | 4-byte int| Very fast | Higher     | Checksums, sharding   |
| MD5()    | 16-byte hex| Moderate | Very low   | Non-security hashing  |
| SHA1()   | 20-byte hex| Moderate | Very low   | Non-security hashing  |

Use `CRC32()` when speed and compactness matter and collisions are tolerable. Use `MD5()`/`SHA1()` when lower collision probability is required.

## Summary

`CRC32()` returns a fast, deterministic 32-bit integer checksum of a string. It is case-sensitive and returns `NULL` for `NULL` input. Key use cases include change detection, data integrity checks, hash-based sharding, and deduplication screening. It is not suitable for cryptographic purposes due to its small output size and collision rate, but is excellent for high-speed checksumming and numeric partitioning.

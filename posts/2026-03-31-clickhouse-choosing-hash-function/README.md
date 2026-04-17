# How to Choose the Right Hash Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Hash Function, Performance, Best Practice, Architecture

Description: A complete guide to choosing the right ClickHouse hash function with use case guidance and a decision matrix for common scenarios.

---

ClickHouse provides over 20 hash functions, and choosing the right one can significantly affect query performance, correctness, and system compatibility. This guide walks through the key categories of hash functions and provides a decision matrix to help you pick the right one for your use case.

## Hash Function Categories

ClickHouse hash functions fall into the following categories:

```text
1. General-purpose fast hashes:  cityHash64, farmHash64, metroHash64
2. Ultra-fast single-arg hashes: xxHash32, xxHash64
3. Integer-optimized hashes:     intHash32, intHash64
4. Security-oriented hashes:     sipHash64, sipHash128
5. Cryptographic hashes:         MD5, SHA1, SHA256
6. Compatibility hashes:         javaHash, hiveHash, halfMD5
7. Similarity hashes:            wordShingleMinHash, wordShingleSimHash
8. MurmurHash family:            murmurHash2_32/64, murmurHash3_32/128
```

## Decision Matrix

```text
Use Case                          | Recommended Function
----------------------------------|----------------------------
General-purpose sharding          | cityHash64
High-throughput row hashing       | xxHash64
Hash integer user_id directly     | intHash32 / intHash64
A/B test assignment               | murmurHash2_64 or cityHash64
Protect against hash flooding     | sipHash64Keyed
Content integrity check           | SHA256
Legacy MD5 compatibility          | MD5 / halfMD5
Java ecosystem compatibility      | javaHash
Hive/Hadoop migration             | hiveHash
URL-based routing/grouping        | URLHash
Near-duplicate document detection | wordShingleMinHash
128-bit fingerprint               | sipHash128 / murmurHash3_128
```

## General-Purpose Sharding: cityHash64

`cityHash64` is the most commonly used hash function in ClickHouse. It is fast, accepts multiple arguments, and produces well-distributed 64-bit values.

```sql
-- Recommended for most sharding and bucketing tasks
SELECT
    user_id,
    cityHash64(user_id) % 16 AS shard
FROM users
LIMIT 10;
```

## High-Throughput Hashing: xxHash64

`xxHash64` is a very fast option for hashing a single string value and is often the top choice when processing billions of rows and hashing a single column. Actual throughput versus `cityHash64` is workload-dependent, so benchmark both on your data if performance is critical.

```sql
-- Single-column, maximum throughput
SELECT
    event_id,
    xxHash64(payload) AS payload_hash
FROM events
LIMIT 10;
```

## Integer Keys: intHash32 / intHash64

When your key is already an integer, use `intHash32` or `intHash64` to avoid the overhead of converting to a string.

```sql
-- Fastest for integer keys
SELECT
    user_id,
    intHash32(user_id) % 10 AS sample_bucket
FROM users
WHERE intHash32(user_id) % 10 = 0;
```

## Security-Sensitive: sipHash64 / sipHash64Keyed

Use the SipHash family when hashing user-controlled inputs that could be crafted to cause hash collisions in non-keyed hash functions. Note that `sipHash64` in ClickHouse uses a fixed (public) key, so for true hash-flooding protection against an adversary, use `sipHash64Keyed` with a secret, runtime-chosen key.

```sql
-- Safer for user-controlled input (secret key prevents adversarial collisions)
SELECT
    request_id,
    sipHash64Keyed((k0, k1), user_input_field) AS safe_hash
FROM user_requests
LIMIT 10;
```

## Content Integrity: SHA256

For verifying data integrity where you need a well-known standard, use SHA256.

```sql
-- Standard content checksum
SELECT
    file_id,
    hex(SHA256(file_content)) AS checksum
FROM files
LIMIT 10;
```

## Feature Hashing for ML: murmurHash3_32

For machine learning feature hashing (the "hashing trick"), `murmurHash3_32` is the standard choice.

```sql
-- Map categorical features to a 1024-bucket space
SELECT
    product_id,
    murmurHash3_32(category) % 1024 AS feature_bucket
FROM products
LIMIT 10;
```

## Performance Comparison

```sql
-- Compare all major hash functions on the same input
SELECT
    'benchmark'                              AS input,
    cityHash64('benchmark')                  AS city64,
    xxHash64('benchmark')                    AS xx64,
    farmHash64('benchmark')                  AS farm64,
    metroHash64('benchmark')                 AS metro64,
    sipHash64('benchmark')                   AS sip64,
    murmurHash3_32('benchmark')              AS mh3_32,
    murmurHash2_64('benchmark')              AS mh2_64,
    halfMD5('benchmark')                     AS half_md5;
```

## Anti-Patterns to Avoid

```sql
-- AVOID: Don't use MD5 for general hashing - it is slow
-- cityHash64 is much faster for non-cryptographic use
-- BAD:
SELECT MD5(event_payload) FROM events;

-- GOOD:
SELECT cityHash64(event_payload) FROM events;

-- AVOID: Don't convert integers to strings before hashing
-- BAD:
SELECT xxHash64(toString(user_id)) FROM users;

-- GOOD:
SELECT intHash64(user_id) FROM users;
```

## Summary

The right hash function depends on your use case. For general-purpose sharding and sampling, `cityHash64` is the default choice. For maximum throughput on single string inputs, use `xxHash64`. For integer keys, use `intHash32` or `intHash64`. For security-sensitive applications where adversarial input could trigger hash-collision attacks, use `sipHash64Keyed` with a secret key. For cryptographic checksums, use `SHA256`. For compatibility with Java or Hive, use `javaHash` or `hiveHash`. Keep your function choice consistent within a system - mixing hash functions for the same logical key will produce inconsistent results.

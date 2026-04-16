# How to Use javaHash() and hiveHash() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Hash Function, Java, Hive, Cross-System Compatibility

Description: Learn how to use javaHash() and hiveHash() in ClickHouse to replicate Java and Hive hash behavior for cross-system compatibility and migration.

---

When migrating data pipelines from the Java or Hadoop/Hive ecosystems to ClickHouse, you often need to replicate hash-based logic that already exists in those systems. ClickHouse provides `javaHash()` which implements `java.lang.String.hashCode()`, and `hiveHash()` which implements the Hive hash function. This allows you to compute identical hash values to your existing Java or Hive code within ClickHouse queries.

## javaHash() - Java String.hashCode() Compatibility

`javaHash(str)` computes the same value as `java.lang.String.hashCode()` in Java. This is important when your partitioning or routing logic was originally implemented in Java and needs to be replicated in ClickHouse.

```sql
-- Compute a Java-compatible hashCode
SELECT javaHash('hello world') AS java_hashcode;

-- The equivalent Java code would be:
-- "hello world".hashCode()  ->  1794106052
```

Note: `javaHash()` returns an Int32 (signed 32-bit integer), matching the return type of Java's `hashCode()`.

## hiveHash() - Apache Hive Compatibility

`hiveHash(str)` computes the same value as Apache Hive's `hash()` function (for Hive versions before 3.0). It is defined as `javaHash` with the sign bit zeroed out (i.e. `javaHash(str) & 0x7FFFFFFF`), so the result is always a non-negative Int32.

```sql
-- Compute a Hive-compatible hash
SELECT hiveHash('hello world') AS hive_hash;

-- Compare the two functions
SELECT
    'hello world'              AS input,
    javaHash('hello world')    AS java_hash,
    hiveHash('hello world')    AS hive_hash;
```

## Cross-System Partition Routing

A common use case is replicating Hive's partition routing logic in ClickHouse to ensure the same rows land in the same partition.

```sql
-- Replicate Hive DISTRIBUTE BY hash(user_id) % 100
SELECT
    user_id,
    hiveHash(toString(user_id)) % 100 AS hive_bucket
FROM users
LIMIT 20;
```

## Verifying Migration Correctness

When migrating data from Hive to ClickHouse, use `hiveHash` to verify that the hash-based bucketing in ClickHouse matches the original Hive output.

```sql
-- Compare ClickHouse computed hash against expected Hive hash
SELECT
    record_id,
    expected_hive_bucket,
    hiveHash(toString(record_id)) % num_buckets AS ch_computed_bucket,
    expected_hive_bucket = hiveHash(toString(record_id)) % num_buckets AS matches
FROM migration_validation
LIMIT 20;
```

## Java-Based Sharding Compatibility

If your Java application distributes keys across nodes using `hashCode() % numNodes`, you can replicate the same sharding in ClickHouse.

```sql
-- Replicate Java sharding: key.hashCode() % 8
SELECT
    item_key,
    javaHash(item_key) % 8  AS java_shard
FROM inventory
LIMIT 20;

-- Note: Java's % operator can return negative values for negative hashCodes.
-- In ClickHouse, use abs() to match Java behavior:
SELECT
    item_key,
    abs(javaHash(item_key)) % 8 AS java_shard_abs
FROM inventory
LIMIT 20;
```

## Handling Negative Hash Values

Java's `hashCode()` can return negative integers. If the original Java code uses `Math.abs(key.hashCode()) % n`, replicate this in ClickHouse with `abs()`.

```sql
-- Replicate Math.abs(str.hashCode()) % 10
SELECT
    user_id,
    key_value,
    abs(javaHash(key_value)) % 10 AS bucket
FROM partitioned_data
LIMIT 10;
```

## javaHashUTF16LE for UTF-16 Strings

ClickHouse also provides `javaHashUTF16LE(str)` for strings encoded as UTF-16 LE, matching Java's `String.hashCode()` on platforms that use UTF-16 internally.

```sql
-- For UTF-16 LE encoded strings
SELECT javaHashUTF16LE('hello') AS utf16_hash;
```

## Summary

`javaHash()` and `hiveHash()` are cross-system compatibility functions that replicate the hash behavior of Java's `String.hashCode()` and Apache Hive's `hash()` function respectively. Use them when migrating from Java or Hadoop/Hive ecosystems to ClickHouse and you need to preserve the same hash-based routing or partitioning logic. For new applications, prefer `cityHash64()` or `murmurHash3_32()` which have better distribution properties.

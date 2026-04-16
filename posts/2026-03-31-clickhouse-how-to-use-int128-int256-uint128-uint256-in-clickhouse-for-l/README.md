# How to Use Int128, Int256, UInt128, UInt256 in ClickHouse for Large Numbers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Type, Int128, Int256, Large Numbers, Blockchain

Description: Learn how to use ClickHouse's extended integer types Int128, Int256, UInt128, and UInt256 for storing and computing with very large numbers in analytics.

---

## Why Extended Integer Types

Standard 64-bit integers support values up to about 9.2 * 10^18. For certain use cases - blockchain token balances, cryptographic identifiers, UUID-like IDs, or scientific computing - you need larger integer ranges. ClickHouse provides:

| Type | Bits | Min Value | Max Value |
|------|------|-----------|-----------|
| `Int128` | 128 | -1.7 * 10^38 | 1.7 * 10^38 |
| `UInt128` | 128 | 0 | 3.4 * 10^38 |
| `Int256` | 256 | -5.8 * 10^76 | 5.8 * 10^76 |
| `UInt256` | 256 | 0 | 1.2 * 10^77 |

```sql
CREATE TABLE large_number_demo (
    id UInt64,
    token_balance UInt128,
    signed_delta Int128,
    large_hash UInt256,
    scientific_val Int256
) ENGINE = MergeTree()
ORDER BY id;
```

## Inserting Large Number Values

```sql
-- Direct literal insertion
INSERT INTO large_number_demo VALUES
(1, 340282366920938463463374607431768211455, -123456789012345678901234567890,
   11579208923731619542357098500868790785326998466564056403945758400791312963993,
   -57896044618658097711785492504343953926634992332820282019728792003956564819968);

-- Using toUInt128/toInt128/toUInt256/toInt256 casting
INSERT INTO large_number_demo (id, token_balance) VALUES
(2, toUInt128('99999999999999999999999999999999999999'));

-- From string representation
SELECT toUInt256('115792089237316195423570985008687907853269984665640564039457584007913129639935');
```

## Arithmetic with Large Numbers

```sql
-- Basic arithmetic works normally
SELECT
    toUInt128(1000000000000000000) * toUInt128(1000000000000000000) AS big_product,
    toInt128(-500000000000000000000) + toInt128(999999999999999999999) AS big_sum;

-- Practical: track ERC-20 token balances in wei (18 decimal places)
CREATE TABLE token_transfers (
    block_number UInt64,
    tx_hash FixedString(66),
    from_address FixedString(42),
    to_address FixedString(42),
    amount UInt256,  -- wei amount (1 ETH = 10^18 wei)
    token_contract FixedString(42)
) ENGINE = MergeTree()
ORDER BY (block_number, tx_hash);

-- Sum large token amounts
SELECT
    to_address,
    sum(amount) AS total_received_wei,
    -- Convert to token units (18 decimals)
    toString(sum(amount) / toUInt256(1000000000000000000)) AS total_tokens
FROM token_transfers
GROUP BY to_address
ORDER BY total_received_wei DESC
LIMIT 10;
```

## Comparison and Ordering

```sql
-- Large numbers compare correctly
SELECT
    a,
    b,
    a > b AS a_greater,
    a = b AS equal
FROM (
    SELECT
        toUInt128('99999999999999999999999999999999999999') AS a,
        toUInt128('99999999999999999999999999999999999998') AS b
);

-- ORDER BY works with large integer types
SELECT token_balance
FROM large_number_demo
ORDER BY token_balance DESC;
```

## Aggregate Functions

```sql
-- sum(), min(), max(), avg() all work on Int128/UInt128/Int256/UInt256
SELECT
    sum(token_balance) AS total_balance,
    max(token_balance) AS max_balance,
    min(token_balance) AS min_balance,
    avg(token_balance) AS avg_balance
FROM large_number_demo;

-- GROUP BY with large numbers
SELECT
    toStartOfDay(toDateTime(block_number * 12)) AS day,
    sum(amount) AS daily_volume
FROM token_transfers
GROUP BY day
ORDER BY day;
```

## Type Casting and Conversion

```sql
-- Cast between numeric types
SELECT
    toInt128(toUInt64(9223372036854775807)),  -- UInt64 -> Int128
    toUInt256(toInt256(-1)),                   -- wraps around for unsigned
    toInt128(-12345),                          -- Int32 -> Int128
    CAST(42 AS UInt256);                       -- SQL CAST syntax

-- String to large integer
SELECT
    toUInt128OrZero('not_a_number'),           -- returns 0 on failure
    toUInt128OrNull('also_bad'),               -- returns NULL on failure
    toUInt128('999999999999999999999999999');  -- valid conversion
```

## Using with Hex and Binary Representations

```sql
-- Store hash values as UInt256 instead of strings
-- SHA-256 hashes fit in UInt256
CREATE TABLE content_hashes (
    content_id UInt64,
    sha256_hash UInt256,
    content_type LowCardinality(String)
) ENGINE = MergeTree()
ORDER BY (content_type, sha256_hash);

-- Hex string to UInt256
SELECT reinterpretAsUInt256(unhex('a' || repeat('0', 63)));

-- UInt256 to hex
SELECT hex(toUInt256(255));
```

## Performance Considerations

```sql
-- Int128/UInt128 are slower than Int64/UInt64
-- ClickHouse has SIMD optimizations for 64-bit but not all 128/256-bit ops
-- Only use when you genuinely need the range

-- Benchmark comparison
SELECT
    sum(toUInt64(rand())) AS sum_64bit,
    sum(toUInt128(rand())) AS sum_128bit
FROM numbers(100000000);
-- 128-bit sum will be ~2-5x slower
```

## Practical Example: Blockchain Analytics

```sql
CREATE TABLE ethereum_transactions (
    block_ts DateTime,
    from_addr FixedString(42),
    to_addr FixedString(42),
    value_wei UInt256,
    gas_used UInt64,
    gas_price UInt128
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(block_ts)
ORDER BY (block_ts, from_addr);

-- Top addresses by ETH sent
SELECT
    from_addr,
    count() AS tx_count,
    formatReadableQuantity(
        toFloat64(sum(value_wei)) / 1e18
    ) AS eth_sent
FROM ethereum_transactions
GROUP BY from_addr
ORDER BY sum(value_wei) DESC
LIMIT 20;
```

## Summary

ClickHouse's extended integer types - Int128, UInt128, Int256, and UInt256 - enable storing and computing with very large numbers that exceed 64-bit range. They are essential for blockchain applications (token balances, hash values), scientific computing, and cryptographic identifiers. These types support all standard arithmetic and aggregate operations, though with some performance overhead compared to 64-bit integers. Use them only when the value range genuinely requires it.

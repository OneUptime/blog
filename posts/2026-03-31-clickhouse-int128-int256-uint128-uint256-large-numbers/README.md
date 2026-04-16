# How to Use Int128, Int256, UInt128, UInt256 in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, Int128, Int256, UInt128, UInt256

Description: Guide to ClickHouse's large integer types Int128, Int256, UInt128, and UInt256 - value ranges, use cases, and performance considerations.

---

Most workloads fit comfortably within `Int64` or `UInt64`, but some domains - blockchain transaction IDs, cryptographic hashes, large financial ledger entries, or distributed system identifiers - require integers that exceed 64-bit bounds. ClickHouse supports four extended integer types: `Int128`, `Int256`, `UInt128`, and `UInt256`. This post covers their value ranges, when to use them, and the performance trade-offs you should know before reaching for them.

## Value Ranges

Each type doubles the bit width and therefore the representable range:

| Type | Bits | Min Value | Max Value |
|---|---|---|---|
| `Int64` | 64 | -9.2 x 10^18 | 9.2 x 10^18 |
| `UInt64` | 64 | 0 | 1.8 x 10^19 |
| `Int128` | 128 | -1.7 x 10^38 | 1.7 x 10^38 |
| `UInt128` | 128 | 0 | 3.4 x 10^38 |
| `Int256` | 256 | -5.8 x 10^76 | 5.8 x 10^76 |
| `UInt256` | 256 | 0 | 1.16 x 10^77 |

```sql
SELECT
    toTypeName(toInt128(0))   AS t1,
    toTypeName(toUInt128(0))  AS t2,
    toTypeName(toInt256(0))   AS t3,
    toTypeName(toUInt256(0))  AS t4;
```

## Creating Tables with Large Integer Types

```sql
CREATE TABLE blockchain_transactions
(
    block_number    UInt64,
    tx_hash         UInt256,    -- 256-bit transaction hash as integer
    from_address    UInt256,    -- Ethereum addresses are 160-bit; ClickHouse has no UInt160, so store in UInt256
    to_address      UInt256,
    value_wei       UInt256,    -- Wei amounts can exceed UInt64
    gas_used        UInt64,
    block_time      DateTime
)
ENGINE = MergeTree()
ORDER BY (block_number, tx_hash);
```

```sql
CREATE TABLE financial_ledger
(
    entry_id        UInt64,
    account_id      Int128,     -- Large account namespace
    amount_micro    Int128,     -- Micro-units to avoid Decimal overhead
    running_total   Int256,     -- Cumulative sum that could be very large
    entry_time      DateTime64(3)
)
ENGINE = MergeTree()
ORDER BY (account_id, entry_time);
```

## Inserting and Querying Large Values

You can insert large integer literals directly as strings in numeric notation, or use the `toInt128`, `toUInt128`, `toInt256`, `toUInt256` cast functions:

```sql
INSERT INTO blockchain_transactions VALUES (
    15000000,
    toUInt256('115792089237316195423570985008687907853269984665640564039457584007913129639935'),
    toUInt256('0'),
    toUInt256('1234567890123456789012345678901234567890'),
    toUInt256('1000000000000000000'),  -- 1 ETH in Wei
    21000,
    now()
);
```

```sql
SELECT
    block_number,
    tx_hash,
    value_wei,
    value_wei / toUInt256(1000000000000000000) AS value_eth_approx
FROM blockchain_transactions
LIMIT 5;
```

## Arithmetic with Large Integer Types

Standard arithmetic operators work on large integer types. ClickHouse promotes smaller types automatically when mixing:

```sql
SELECT
    toUInt256(1000000000000000000) * toUInt256(1000000000000000000) AS product,
    toInt256(-1) * toInt256(9999999999999999999999999999999999999) AS large_negative,
    toUInt256(2) + toUInt256(340282366920938463463374607431768211455) AS near_max_128;
```

Overflow in large integer types wraps around (same as other ClickHouse integer types), so validate your ranges:

```sql
-- Safe range check before arithmetic
SELECT
    if(
        value_wei <= toUInt256('115792089237316195423570985008687907853269984665640564039457584007913129639935'),
        'in range',
        'overflow risk'
    ) AS range_check
FROM blockchain_transactions;
```

## Type Casting and Conversions

```sql
SELECT
    toInt128(9999999999999999999)          AS from_int64_literal,
    toUInt128('123456789012345678901234')  AS from_string,
    toInt256(toInt128(-42))               AS widening_cast,
    toInt64(toInt128(100))                AS narrowing_cast;
```

Converting to/from `Float64` loses precision for very large values - avoid this pattern for financial data:

```sql
-- Precision is lost beyond 15-16 significant digits
SELECT
    toFloat64(toUInt256('123456789012345678901234567890')) AS lossy_float;
```

## Use Cases

### Blockchain and Cryptography

Ethereum addresses are 160-bit and transaction hashes are 256-bit. `UInt256` is the natural fit:

```sql
SELECT
    hex(tx_hash)               AS tx_hash_hex,
    length(hex(tx_hash))       AS hex_length,
    bitAnd(tx_hash, toUInt256('1461501637330902918203684832716283019655932542975')) AS address_bits
FROM blockchain_transactions
LIMIT 5;
```

### Large Counter Aggregations

When summing many large values, the accumulated total may overflow `Int64`:

```sql
SELECT
    account_id,
    sum(toInt256(amount_micro)) AS total_micro,
    sum(toInt256(amount_micro)) / toInt256(1000000) AS total_units
FROM financial_ledger
GROUP BY account_id;
```

### Distributed System Identifiers

Some systems use 128-bit UUIDs as integers rather than the UUID type, or combine multiple fields into a single large integer key:

```sql
SELECT
    UUIDStringToNum('550e8400-e29b-41d4-a716-446655440000')  AS uuid_bytes,
    toUInt128(reinterpretAsUInt128(
        UUIDStringToNum('550e8400-e29b-41d4-a716-446655440000')
    ))                                                        AS uuid_as_uint128;
```

## Performance Considerations

Large integer types have meaningful performance costs compared to 64-bit integers:

- **Storage**: `Int128` uses 16 bytes per value (2x `Int64`), `Int256` uses 32 bytes (4x).
- **CPU instructions**: 128-bit and 256-bit arithmetic is not natively supported on x86-64 - it is emulated using multiple 64-bit instructions, making it 2-4x slower than 64-bit arithmetic.
- **Vectorization**: SIMD optimization is less effective for 256-bit integers.
- **Compression**: Larger values compress less efficiently than smaller ones.

```sql
-- Compare storage usage
SELECT
    column,
    sum(data_uncompressed_bytes) AS uncompressed,
    sum(data_compressed_bytes)   AS compressed,
    round(sum(data_compressed_bytes) / sum(data_uncompressed_bytes), 3) AS ratio
FROM system.parts_columns
WHERE table IN ('blockchain_transactions', 'financial_ledger')
GROUP BY column
ORDER BY uncompressed DESC;
```

Prefer the smallest type that covers your value range. Only use `Int128`/`UInt128`/`Int256`/`UInt256` when `Int64`/`UInt64` would genuinely overflow.

## Summary

ClickHouse's large integer types (`Int128`, `UInt128`, `Int256`, `UInt256`) are essential for domains like blockchain, cryptography, and financial systems where 64-bit integers are insufficient. They carry a measurable performance and storage cost due to software emulation of wide arithmetic, so use them only when the value range genuinely demands it. For most analytics workloads, `Int64` or `UInt64` remain the better choice.

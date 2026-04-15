# How to Choose the Right Numeric Data Type in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Data Type, Integer, Float, Decimal, Performance

Description: A decision matrix for choosing between Int, UInt, Float32, Float64, and Decimal types in ClickHouse with storage sizes and examples.

---

ClickHouse offers a wide range of numeric types: signed and unsigned integers from 8 to 256 bits, two floating-point types, and the `Decimal` family for exact arithmetic. Picking the wrong type leads to wasted storage, unexpected precision loss, or overflow. This post provides a practical decision matrix covering the full range of numeric types, their storage costs, and guidance on which to reach for in common analytics and engineering scenarios.

## Integer Types Overview

ClickHouse provides signed integers (`Int8` through `Int256`) and unsigned integers (`UInt8` through `UInt256`):

| Type | Bytes | Signed Range | Unsigned Range |
|---|---|---|---|
| `Int8` / `UInt8` | 1 | -128 to 127 | 0 to 255 |
| `Int16` / `UInt16` | 2 | -32,768 to 32,767 | 0 to 65,535 |
| `Int32` / `UInt32` | 4 | -2.1B to 2.1B | 0 to 4.3B |
| `Int64` / `UInt64` | 8 | -9.2 x 10^18 to 9.2 x 10^18 | 0 to 1.8 x 10^19 |
| `Int128` / `UInt128` | 16 | - | - |
| `Int256` / `UInt256` | 32 | - | - |

```sql
-- Check your data range before choosing a type
SELECT
    min(value)  AS min_val,
    max(value)  AS max_val,
    count()     AS row_count
FROM your_table;
```

## Floating-Point Types

| Type | Bytes | Precision | Use Case |
|---|---|---|---|
| `Float32` | 4 | ~7 significant digits | Low-precision metrics, ML features |
| `Float64` | 8 | ~15-16 significant digits | Scientific, high-precision calculations |

```sql
SELECT
    toFloat32(1.123456789)   AS f32,
    toFloat64(1.123456789)   AS f64;
-- f32: 1.1234568 (rounded)
-- f64: 1.123456789 (full precision)
```

Important: Floating-point types cannot represent decimal fractions exactly. `0.1 + 0.2 != 0.3` in both `Float32` and `Float64`.

```sql
SELECT toFloat64(0.1) + toFloat64(0.2) = toFloat64(0.3);
-- Result: 0 (false) - floating-point representation error
```

## Decimal Types

| Type | Bytes | Max Digits | Scale Range (S) | Use Case |
|---|---|---|---|---|
| `Decimal32(S)` | 4 | 9 | 0-9 | Small monetary amounts |
| `Decimal64(S)` | 8 | 18 | 0-18 | Standard financial values |
| `Decimal128(S)` | 16 | 38 | 0-38 | Large financial, scientific |
| `Decimal256(S)` | 32 | 76 | 0-76 | Very large exact arithmetic |

`S` is the scale (digits after decimal point). `Decimal64(2)` stores values with 2 decimal places.

```sql
SELECT
    toDecimal64(0.1, 2) + toDecimal64(0.2, 2) = toDecimal64(0.3, 2);
-- Result: 1 (true) - exact decimal arithmetic
```

## Decision Matrix

Use this matrix to select the correct type:

| Scenario | Recommended Type | Why |
|---|---|---|
| Boolean flag (0/1) | `UInt8` or `Bool` | 1 byte, no overhead |
| Age, small counter | `UInt8` or `UInt16` | Covers 0-255 or 0-65K |
| User ID (millions) | `UInt32` | Covers up to 4.3B |
| User ID (billions+) | `UInt64` | Industry standard for large IDs |
| Unix timestamp (sec) | `UInt32` or `Int64` | UInt32 until 2106, Int64 for flexibility |
| Byte count / file size | `UInt64` | Up to 18 exabytes |
| Temperature (-40 to 85C) | `Int8` | 1 byte covers range |
| HTTP status code | `UInt16` | 0-65535, covers all codes |
| Latitude / longitude | `Float64` | Requires ~7 decimal digits |
| Price / monetary value | `Decimal64(2)` | Exact 2-decimal precision |
| Percentage (0.00-100.00) | `Decimal32(2)` | Exact, compact |
| Count of events | `UInt64` | Never negative, large range |
| Duration in ms | `UInt32` or `UInt64` | Depends on max expected value |
| ML model feature | `Float32` | Lower precision acceptable, halves memory |
| Blockchain value (Wei) | `UInt256` | 256-bit values required |

## Practical Examples

### Web Analytics Table

```sql
CREATE TABLE page_views
(
    view_id       UInt64,         -- large auto-increment ID
    session_id    UInt64,         -- session identifier
    user_id       UInt32,         -- up to 4.3B users
    status_code   UInt16,         -- HTTP status
    response_ms   UInt32,         -- response time in ms
    bytes_sent    UInt64,         -- response size
    timestamp     DateTime,
    is_bot        Bool            -- boolean flag
)
ENGINE = MergeTree()
ORDER BY (user_id, timestamp);
```

### Financial Transactions Table

```sql
CREATE TABLE transactions
(
    tx_id         UInt64,
    account_id    UInt64,
    amount        Decimal64(2),   -- exact monetary value
    fee           Decimal64(4),   -- fee with 4 decimal places
    exchange_rate Decimal64(6),   -- exchange rate precision
    quantity      UInt32,         -- item quantity
    timestamp     DateTime64(3)
)
ENGINE = MergeTree()
ORDER BY (account_id, timestamp);
```

### IoT Sensor Table

```sql
CREATE TABLE sensor_readings
(
    device_id     UInt32,
    temperature   Float32,        -- -40.0 to 85.0 celsius, Float32 sufficient
    humidity      Float32,        -- 0.0 to 100.0 percent
    pressure_hpa  Float32,        -- atmospheric pressure
    battery_pct   UInt8,          -- 0-100 percent
    signal_rssi   Int8,           -- -120 to 0 dBm
    timestamp     DateTime64(3)
)
ENGINE = MergeTree()
ORDER BY (device_id, timestamp);
```

## Storage Impact at Scale

The choice of numeric type has a large impact at scale. For 1 billion rows:

| Type | Storage | vs Int64 |
|---|---|---|
| `UInt8` | 1 GB | 8x smaller |
| `UInt16` | 2 GB | 4x smaller |
| `UInt32` | 4 GB | 2x smaller |
| `UInt64` | 8 GB | baseline |
| `Float32` | 4 GB | 2x smaller |
| `Float64` | 8 GB | same |
| `Decimal64(2)` | 8 GB | same as Int64 |

```sql
-- Estimate storage for a column type change
SELECT
    column,
    type,
    sum(data_uncompressed_bytes) / 1e9 AS uncompressed_gb,
    sum(data_compressed_bytes) / 1e9   AS compressed_gb
FROM system.parts_columns
WHERE table = 'page_views'
GROUP BY column, type
ORDER BY uncompressed_gb DESC;
```

## Overflow Behavior

ClickHouse promotes result types for sub-32-bit arithmetic (e.g. `UInt8 + UInt8` produces `UInt16`), so small-type additions do not wrap in isolation. However, overflow wraps silently when storing into a narrower column or casting back, and for 64-bit types where no further promotion occurs. Validate your type selection covers expected values:

```sql
-- ClickHouse promotes small integer arithmetic results
SELECT toUInt8(255) + 1;  -- Result: 256 (promoted to UInt16)

-- Wrapping occurs when casting back to a smaller type
SELECT toUInt8(256);  -- Result: 0 (wraps)

-- Use larger types or add guards
SELECT if(value > 254, NULL, toUInt8(value)) AS safe_uint8
FROM (SELECT 255 AS value);
```

## Float vs Decimal Summary

Prefer `Decimal` when:
- Storing money, prices, rates, or percentages.
- Exact equality comparisons are needed.
- Accumulating many additions/subtractions (floats accumulate error).

Prefer `Float` when:
- Values are naturally approximate (sensor readings, ML features, geographic coordinates).
- Arithmetic precision beyond 15 digits is not needed.
- Storage efficiency matters and some rounding is acceptable.

## Summary

Choosing the right numeric type in ClickHouse means matching the type's range and precision characteristics to your actual data. Use the smallest integer type that covers your range - it saves storage and improves cache efficiency. Use `Decimal` for any exact-precision requirement (money, rates, quantities) and `Float32`/`Float64` for naturally approximate data. Avoid `Int128`/`Int256` unless your values genuinely exceed 64-bit bounds, as they carry a significant performance cost.

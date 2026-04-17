# How to Create Tables with Codecs for Compression in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, DDL, Codec, Compression, MergeTree

Description: Learn how to apply compression codecs in ClickHouse CREATE TABLE statements, including LZ4, ZSTD, Delta, DoubleDelta, Gorilla, and codec chaining.

---

ClickHouse stores each column in a separate file and compresses it with a codec. Choosing the right codec for a column's data distribution dramatically reduces storage size and often improves query speed by reducing I/O. Codecs are declared per-column in the `CREATE TABLE` statement.

## Codec Syntax

```sql
column_name data_type CODEC(codec_name[(level)])
```

Multiple codecs can be chained: data passes through each codec in order on write and in reverse order on read.

```sql
column_name data_type CODEC(codec1, codec2)
```

## General-Purpose Codecs

### LZ4

Fast compression with moderate ratio. The default for most columns.

```sql
CREATE TABLE events
(
    created_at DateTime  CODEC(LZ4),
    user_id    UInt64    CODEC(LZ4),
    payload    String    CODEC(LZ4)
)
ENGINE = MergeTree()
ORDER BY created_at;
```

### ZSTD

Slower but higher compression ratio. Accepts a level 1-22 (default 1). Higher levels compress more but are slower.

```sql
CREATE TABLE logs
(
    timestamp  DateTime  CODEC(ZSTD(1)),
    message    String    CODEC(ZSTD(3)),
    raw_json   String    CODEC(ZSTD(9))
)
ENGINE = MergeTree()
ORDER BY timestamp;
```

### LZ4HC

High-compression variant of LZ4. Accepts a level 1-12.

```sql
CREATE TABLE archive_events
(
    ts      DateTime  CODEC(LZ4HC(6)),
    data    String    CODEC(LZ4HC(9))
)
ENGINE = MergeTree()
ORDER BY ts;
```

### NONE

Disables compression entirely. Useful for columns that are already compressed externally or for benchmarking.

```sql
CREATE TABLE raw_binary
(
    id    UInt64  CODEC(NONE),
    blob  String  CODEC(NONE)
)
ENGINE = MergeTree()
ORDER BY id;
```

## Delta Codec

Delta stores the difference between consecutive values rather than absolute values. Best for monotonically increasing integers and timestamps.

```sql
CREATE TABLE sensor_readings
(
    -- Delta compresses timestamps very efficiently
    recorded_at  DateTime  CODEC(Delta, ZSTD(1)),
    -- Delta on a counter column
    sequence_no  UInt64    CODEC(Delta, LZ4),
    temperature  Float32
)
ENGINE = MergeTree()
ORDER BY recorded_at;
```

By default `Delta` infers the byte width from the column type, so you can use it without any argument:

```sql
counter UInt32 CODEC(Delta, ZSTD(1))
```

## DoubleDelta Codec

DoubleDelta stores the difference of differences. Best for sequences with a constant rate of change, such as evenly-spaced time series.

```sql
CREATE TABLE timeseries
(
    ts    DateTime64(3)  CODEC(DoubleDelta, ZSTD(1)),
    value Float64
)
ENGINE = MergeTree()
ORDER BY ts;
```

## Gorilla Codec

Gorilla uses XOR-based compression optimised for floating-point values with small incremental changes. Excellent for metrics and sensor data.

```sql
CREATE TABLE metrics
(
    ts          DateTime  CODEC(Delta, ZSTD(1)),
    cpu_usage   Float64   CODEC(Gorilla, ZSTD(1)),
    memory_mb   Float64   CODEC(Gorilla, ZSTD(1)),
    disk_iops   Float64   CODEC(Gorilla, LZ4)
)
ENGINE = MergeTree()
ORDER BY ts;
```

## T64 Codec

T64 transposes a 64-row block and strips common high bits. Effective for small integers stored in wide types (e.g., UInt64 values that actually fit in 16 bits).

```sql
CREATE TABLE event_counts
(
    day         Date    CODEC(Delta, LZ4),
    -- Values rarely exceed 2^16 but column type is UInt64
    count       UInt64  CODEC(T64, ZSTD(1)),
    error_count UInt64  CODEC(T64, LZ4)
)
ENGINE = MergeTree()
ORDER BY day;
```

## Codec Chaining

Chain a transformation codec (Delta, DoubleDelta, Gorilla, T64) with a general codec (LZ4, ZSTD) to get the best of both:

```sql
CREATE TABLE iot_events
(
    device_id   UInt32    CODEC(T64, LZ4),
    -- Monotonic timestamp: Delta removes trend, ZSTD compresses residual
    recorded_at DateTime  CODEC(Delta, ZSTD(1)),
    -- Float metric: Gorilla captures float structure, LZ4 is fast
    value       Float32   CODEC(Gorilla, LZ4),
    -- High-entropy string: just ZSTD
    label       String    CODEC(ZSTD(3))
)
ENGINE = MergeTree()
ORDER BY (device_id, recorded_at);
```

## Complete Production Table Example

```sql
CREATE TABLE application_metrics
(
    -- Timestamp with delta + zstd for sorted, monotonic data
    ts           DateTime64(3)         CODEC(Delta, ZSTD(1)),
    -- Low-cardinality strings: LZ4 is sufficient
    host         LowCardinality(String) CODEC(LZ4),
    service      LowCardinality(String) CODEC(LZ4),
    -- Float metrics: Gorilla for time-correlated floats
    cpu_pct      Float32               CODEC(Gorilla, LZ4),
    mem_bytes    UInt64                CODEC(T64, ZSTD(1)),
    request_rate Float64               CODEC(Gorilla, ZSTD(1)),
    -- Sparse flag: no special codec needed
    is_anomaly   UInt8                 CODEC(ZSTD(1)),
    -- High-cardinality text: maximum ZSTD
    trace_id     String                CODEC(ZSTD(9))
)
ENGINE = MergeTree()
PARTITION BY toDate(ts)
ORDER BY (host, service, ts);
```

## Viewing Codecs on an Existing Table

```sql
SELECT
    name,
    type,
    compression_codec
FROM system.columns
WHERE database = 'default'
  AND table = 'application_metrics';
```

## Changing Codec on an Existing Column

```sql
ALTER TABLE application_metrics
    MODIFY COLUMN cpu_pct Float32 CODEC(Gorilla, ZSTD(3));
```

## Summary

ClickHouse column codecs work at the DDL level and are invisible to queries. General-purpose codecs (LZ4, ZSTD, LZ4HC) handle arbitrary data, while specialised codecs (Delta, DoubleDelta, Gorilla, T64) exploit data patterns. Chaining a pattern-aware codec with a general compressor - for example `CODEC(Delta, ZSTD(1))` for timestamps - consistently yields the best compression ratios for structured time-series and metric data.

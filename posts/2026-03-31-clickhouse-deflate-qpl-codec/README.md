# How to Use DEFLATE_QPL Codec in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Compression, DEFLATE_QPL, Codec, Intel

Description: Learn how to use the DEFLATE_QPL codec in ClickHouse, which leverages Intel's Query Processing Library for hardware-accelerated DEFLATE compression.

---

## What is DEFLATE_QPL

DEFLATE_QPL is a ClickHouse compression codec that uses Intel's Query Processing Library (QPL) to offload DEFLATE compression and decompression to Intel hardware accelerators (Intel IAA - In-memory Analytics Accelerator). It provides DEFLATE-level compression ratios with potentially lower CPU overhead on compatible hardware.

## Requirements

DEFLATE_QPL requires:
- Intel Xeon Scalable (Sapphire Rapids or later) processor with IAA for hardware acceleration (a software fallback works on other Intel CPUs with AVX2/AVX-512)
- ClickHouse 22.9 or newer (the `enable_deflate_qpl_codec` setting was introduced in 23.6; earlier versions required `allow_experimental_codecs`). DEFLATE_QPL was removed from ClickHouse in 2025/early-2026 due to a license incompatibility in the underlying `idxd-config` library, so verify your version still supports it before relying on it.
- QPL library installed and enabled at compile time (`-DENABLE_QPL=ON`)

Check if your ClickHouse build supports it:

```sql
SELECT value FROM system.build_options WHERE name = 'ENABLE_QPL';
```

## Create a Table with DEFLATE_QPL

```sql
CREATE TABLE events_qpl (
    ts DateTime CODEC(DEFLATE_QPL),
    user_id UInt32 CODEC(DEFLATE_QPL),
    event_type LowCardinality(String),
    value Float64 CODEC(Gorilla, DEFLATE_QPL)
) ENGINE = MergeTree()
ORDER BY (user_id, ts);
```

## Fallback Behavior

If QPL hardware acceleration is unavailable, ClickHouse falls back to the QPL software DEFLATE implementation automatically. On startup or first use, the server logs either `Hardware-assisted DeflateQpl codec is ready!` or `Initialization of hardware-assisted DeflateQpl codec failed`. You can check with:

```bash
grep -i "DeflateQpl" /var/log/clickhouse-server/clickhouse-server.log
```

## Compare DEFLATE_QPL vs ZSTD

```sql
CREATE TABLE test_deflate_qpl (
    ts DateTime CODEC(Delta(4), DEFLATE_QPL),
    value Float64 CODEC(Gorilla, DEFLATE_QPL),
    label String CODEC(DEFLATE_QPL)
) ENGINE = MergeTree() ORDER BY ts;

CREATE TABLE test_zstd_1 (
    ts DateTime CODEC(Delta(4), ZSTD(1)),
    value Float64 CODEC(Gorilla, ZSTD(1)),
    label String CODEC(ZSTD(1))
) ENGINE = MergeTree() ORDER BY ts;
```

Load the same data and compare:

```sql
SELECT
    table,
    formatReadableSize(sum(data_compressed_bytes)) AS compressed,
    round(sum(data_uncompressed_bytes) / sum(data_compressed_bytes), 2) AS ratio
FROM system.columns
WHERE table IN ('test_deflate_qpl', 'test_zstd_1')
GROUP BY table;
```

## Typical Use Cases

DEFLATE_QPL is most beneficial when:
- You have Intel IAA hardware available
- CPU compression overhead is a bottleneck (high-ingest workloads)
- You want a DEFLATE-class compression ratio while offloading work from CPU cores

## Enable the Codec

DEFLATE_QPL is gated behind a server-level setting. Enable it in your user profile (e.g. `users.xml`):

```xml
<profiles>
    <default>
        <enable_deflate_qpl_codec>1</enable_deflate_qpl_codec>
    </default>
</profiles>
```

Or per session:

```sql
SET enable_deflate_qpl_codec = 1;
```

## Check Compression Results

```sql
SELECT
    column,
    formatReadableSize(data_compressed_bytes) AS compressed,
    formatReadableSize(data_uncompressed_bytes) AS uncompressed,
    round(data_uncompressed_bytes / data_compressed_bytes, 2) AS ratio
FROM system.columns
WHERE table = 'events_qpl';
```

## Summary

DEFLATE_QPL is a specialized ClickHouse codec that uses Intel IAA hardware to accelerate DEFLATE compression. It offers competitive compression ratios with reduced CPU overhead on compatible Intel Xeon hardware. For most workloads without QPL hardware, ZSTD remains the better default choice.

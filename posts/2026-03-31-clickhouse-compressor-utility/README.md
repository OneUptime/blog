# How to Use clickhouse-compressor Utility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, clickhouse-compressor, Compression, Storage, Utility

Description: Learn how to use the clickhouse-compressor utility to compress and decompress ClickHouse data files and test different compression algorithms offline.

---

`clickhouse-compressor` is a standalone utility that compresses and decompresses data using ClickHouse's native compression formats. It is useful for testing compression ratios, offline data processing, and manual data file management.

## Installation

Ships with the ClickHouse package:

```bash
which clickhouse-compressor
# /usr/bin/clickhouse-compressor
```

## Basic Compression

Compress a file using the default LZ4 algorithm:

```bash
clickhouse-compressor < input.bin > output.bin.lz4
```

## Decompression

```bash
clickhouse-compressor --decompress < output.bin.lz4 > restored.bin
```

## Choosing Compression Algorithms

Use `--codec` to select a specific algorithm:

```bash
# ZSTD compression with level 3
clickhouse-compressor --codec ZSTD\(3\) < data.bin > data.zstd

# LZ4HC for better ratio at modest speed
clickhouse-compressor --codec LZ4HC\(9\) < data.bin > data.lz4hc
```

## Comparing Compression Ratios

Test different codecs on sample data to choose the best for your workload:

```bash
for codec in LZ4 ZSTD LZ4HC; do
  size=$(clickhouse-compressor --codec $codec < sample.bin | wc -c)
  echo "$codec: $size bytes"
done
```

## Using with ClickHouse Data Files

Inspect an on-disk ClickHouse column file:

```bash
# ClickHouse stores column data in .bin files
ls /var/lib/clickhouse/data/analytics/events/*/

# Decompress a column file for inspection
clickhouse-compressor --decompress \
  < /var/lib/clickhouse/data/analytics/events/202601_1_1_0/user_id.bin \
  > user_id_raw.bin
```

## Compressing Native Format Exports

Native format exports are not compressed by default. Pipe them through clickhouse-compressor for more efficient storage:

```bash
# Compress an exported Native file
clickhouse-compressor < export.native > export.native.lz4

# Decompress when loading it back
clickhouse-compressor --decompress < export.native.lz4 > export.native
```

## Compressed Data Transfer Pipeline

```bash
# Export -> Compress -> Transfer -> Decompress -> Import
clickhouse-client --query "SELECT * FROM big_table FORMAT Native" \
  | clickhouse-compressor \
  | ssh dest-host "clickhouse-compressor --decompress | clickhouse-client --query 'INSERT INTO big_table FORMAT Native'"
```

## Summary

`clickhouse-compressor` is a simple but handy tool for working with ClickHouse's native compression formats outside the server process. It is useful for offline data inspection, compression benchmarking, and pipeline construction.

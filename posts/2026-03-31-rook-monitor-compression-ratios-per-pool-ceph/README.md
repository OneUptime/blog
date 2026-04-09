# How to Monitor Compression Ratios Per Pool in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Compression, Monitoring, Pool, Storage Efficiency

Description: Learn how to monitor and measure compression ratios per pool in Ceph using ceph df, pool stats, and Prometheus metrics to validate that compression is delivering expected storage savings.

---

## Why Monitor Compression Ratios?

Enabling compression does not guarantee savings. Some data (images, encrypted files, already-compressed archives) does not compress well, and the CPU overhead may outweigh marginal savings. Monitoring compression ratios per pool helps you:

- Validate that compression is delivering expected savings
- Identify pools where compression should be disabled
- Capacity plan based on actual compressed sizes

## Using ceph df detail

The most direct way to check compression savings:

```bash
ceph df detail
```

Look at the `COMPRESS_UNDER_BYTES` column which shows bytes before compression, and `COMPRESS_BYTES_USED` which shows bytes after compression:

```text
POOL           USED    COMPRESS_UNDER_BYTES    COMPRESS_BYTES_USED
mypool         1.2 GiB         4.5 GiB              1.2 GiB
```

Calculate the compression ratio:

```bash
COMPRESS_RATIO=$(ceph df detail --format json | jq '.pools[] | select(.name=="mypool") | .stats.compress_under_bytes / .stats.compress_bytes_used')
echo "Compression ratio: $COMPRESS_RATIO"
```

## Using ceph osd pool stats

```bash
ceph osd pool stats mypool
```

This command shows real-time I/O activity (throughput and IOPS) rather than compression statistics:

```text
pool mypool id 2
  nothing is going on
  client io 12 MB/s wr, 0 op/s rd, 23 op/s wr
```

For compression-specific stats (`compress_bytes_used` and `compress_under_bytes`), use `ceph df detail` as shown above.

## Using rados df

```bash
rados df
```

This shows per-pool usage statistics including object count and total bytes stored. Look for your pool in the output to see storage consumption after compression.

## Querying via Prometheus

If using the Ceph Prometheus exporter or Rook's monitoring stack:

```bash
# Bytes stored after compression
ceph_pool_compress_bytes_used{pool_id="2"}

# Bytes that were eligible for compression (before)
ceph_pool_compress_under_bytes{pool_id="2"}
```

Calculate ratio in PromQL:

```text
ceph_pool_compress_under_bytes / ceph_pool_compress_bytes_used
```

Create a Grafana panel showing compression ratios per pool over time.

## Building a Compression Report Script

```bash
#!/bin/bash
echo "Ceph Pool Compression Report"
echo "============================="
ceph df detail --format json | jq -r '
  .pools[] |
  select(.stats.compress_bytes_used > 0) |
  {
    pool: .name,
    stored_gb: (.stats.compress_bytes_used / 1073741824 | round),
    original_gb: (.stats.compress_under_bytes / 1073741824 | round),
    ratio: (.stats.compress_under_bytes / .stats.compress_bytes_used | . * 100 | round / 100)
  } |
  "\(.pool): \(.stored_gb) GB stored, \(.original_gb) GB original, ratio=\(.ratio)x"
'
```

## Interpreting Results

- Ratio **1.0x** - No compression savings (data may already be compressed)
- Ratio **1.5x to 2.0x** - Typical for general workloads
- Ratio **2.0x to 3.0x** - Good compression (logs, text, JSON)
- Ratio **3.0x+** - Excellent (sparse files, repetitive data)

## When to Disable Compression

If a pool shows a ratio below 1.1x, the CPU overhead of compression likely exceeds the savings. Disable compression:

```bash
ceph osd pool set media-pool compression_mode none
```

## Summary

Monitor compression ratios using `ceph df detail --format json` and Prometheus metrics to validate that compression is delivering meaningful savings. Automate reporting with a script that computes ratio per pool, and disable compression for pools with ratios below 1.1x to avoid unnecessary CPU overhead. Target pools containing text, JSON, or log data for the highest returns on compression.

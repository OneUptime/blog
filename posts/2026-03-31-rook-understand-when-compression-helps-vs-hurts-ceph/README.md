# How to Understand When Compression Helps vs Hurts in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Compression, Performance, Storage Efficiency

Description: Learn when BlueStore compression improves Ceph storage efficiency and when it hurts performance, with a decision framework for choosing the right compression strategy per pool.

---

## Compression Is Not Always Beneficial

While compression can dramatically reduce storage costs, enabling it indiscriminately causes problems:

- **CPU overhead** on every write and read
- **Increased latency** for incompressible data
- **Write amplification** if compression increases blob size

Understanding when compression helps vs hurts is critical for designing a Ceph cluster that performs well across different workload types.

## When Compression Helps

### Text and Structured Data

Log files, JSON, XML, CSV, and database dumps typically achieve 3-5x compression:

```bash
# Test compression ratio on your data
zstd -c -v /var/log/app/*.log > /dev/null
```

Expected output:
```text
/var/log/app/app.log : 14.93% (1.20 MB => 183.6 KB)
```

### Sparse Files

Kubernetes PVCs with partially used filesystems contain many zero-filled pages that compress to nearly nothing.

### Repetitive Data

Backups of similar snapshots, config files, and schema data compress very well.

## When Compression Hurts

### Already-Compressed Data

JPEG images, MP4 video, ZIP archives, tar.gz files, and encrypted data are either random-looking or already compressed. Compression adds CPU overhead with near-zero savings:

```bash
# Check compressibility of a file
lz4 -c /tmp/video.mp4 | wc -c
ls -la /tmp/video.mp4
```

If the compressed size is larger or equal to the original, disable compression.

### High-Throughput NVMe Workloads

On very fast NVMe arrays, compression CPU overhead can become the bottleneck. Profile before enabling:

```bash
# Check OSD CPU usage
kubectl -n rook-ceph top pods -l app=rook-ceph-osd
```

If OSD CPU usage is above 70%, compression will degrade performance.

### Small Random I/O

4KB random writes for databases are often partially compressible but the per-operation overhead of compression adds measurable latency.

## Decision Framework

```text
Is data text, JSON, logs, or CSV?
  --> YES: Use force mode with zstd
  --> NO:

Is data a database (Postgres, MySQL)?
  --> YES: Use aggressive mode with snappy (partial savings, low overhead)
  --> NO:

Is data images, video, or encrypted?
  --> YES: Use none (disable compression)
  --> NO:

Is workload write-heavy (>100K IOPS per OSD)?
  --> YES: Use lz4 or none
  --> NO: Use aggressive with snappy
```

## Checking Actual Savings

Validate after enabling compression:

```bash
ceph df detail --format json | jq '.pools[] | {
  name: .name,
  ratio: (if .stats.compress_bytes_used > 0 then
    (.stats.compress_under_bytes / .stats.compress_bytes_used | . * 10 | round / 10)
  else 0 end)
}'
```

Disable compression on pools where ratio < 1.1:

```bash
ceph osd pool set media-pool compression_mode none
```

## Summary

Compression helps significantly for text, logs, JSON, and sparse data, delivering 3-6x storage savings with minimal overhead. It hurts performance for pre-compressed data (images, video, encrypted files), very high-IOPS NVMe workloads, and small random write patterns. Use `ceph df detail` to measure actual compression ratios per pool and disable compression on any pool where savings are below 10%, freeing up CPU for more impactful work.

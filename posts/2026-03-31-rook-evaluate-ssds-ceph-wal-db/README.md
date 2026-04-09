# How to Evaluate SSDs for Ceph WAL and DB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, SSD, NVMe, WAL, BlueStore, Hardware, Performance

Description: Evaluate and select SSDs for Ceph BlueStore WAL and RocksDB metadata partitions by understanding endurance requirements, performance characteristics, and capacity sizing.

---

## Overview

The SSDs used for Ceph BlueStore WAL and RocksDB DB partitions have a disproportionate impact on cluster performance. These devices handle high write amplification from RocksDB compaction and small random I/O. Choosing the wrong SSD leads to premature wear-out or performance bottlenecks.

## Why SSD Selection Matters for WAL/DB

Ceph's BlueStore writes all metadata to RocksDB, which uses LSM-tree compaction with high write amplification (3-10x). A single NVMe device serving 12 HDDs as their WAL/DB host can sustain 1-3 GB/s of writes, consuming SSD endurance rapidly.

## Step 1 - Calculate Write Amplification

```bash
# Estimate daily writes to WAL/DB SSD
# For 12 HDD OSDs, each HDD handles ~200 MB/s sequential
# Metadata overhead: ~5-10% of data writes go to RocksDB
# RocksDB compaction multiplier: 5-10x

HDD_COUNT=12
DATA_WRITE_MBPS=100  # MB/s average per HDD
META_PERCENT=0.08    # 8% metadata
COMPACTION_AMP=7     # RocksDB write amplification

META_MBPS=$(echo "$HDD_COUNT * $DATA_WRITE_MBPS * $META_PERCENT * $COMPACTION_AMP" | bc)
DAILY_WRITES_TB=$(echo "scale=2; $META_MBPS * 86400 / 1000000" | bc)

echo "Metadata writes to SSD: ${META_MBPS} MB/s"
echo "Daily writes to SSD: ${DAILY_WRITES_TB} TB/day"
```

## Step 2 - Calculate SSD Endurance Requirements

```bash
# For 3-year SSD lifetime target
DAILY_WRITES_TB=2.5
LIFESPAN_DAYS=$((3 * 365))
TOTAL_WRITES_TB=$(echo "$DAILY_WRITES_TB * $LIFESPAN_DAYS" | bc)
TOTAL_WRITES_PB=$(echo "scale=1; $TOTAL_WRITES_TB / 1000" | bc)

echo "Total writes over 3 years: ${TOTAL_WRITES_TB} TB"
echo "Total writes over 3 years: ${TOTAL_WRITES_PB} PB"

# Need an SSD with at least this TBW (total bytes written) rating
echo "Minimum TBW required: ${TOTAL_WRITES_TB} TB"
```

## Step 3 - SSD Categories for WAL/DB

**Consumer SSDs (avoid for WAL/DB):**
- TBW: 200-600 TB for 1 TB drive
- Random write IOPS: 200-400K
- Not suitable for Ceph - insufficient endurance

**Enterprise SATA SSD:**
- TBW: 1-3 PB for 1 TB drive
- Random write IOPS: 50-100K
- Acceptable for HDDs with moderate load

**Enterprise NVMe (recommended):**
- TBW: 1-10 PB for 1 TB drive
- Random write IOPS: 200-700K
- Ideal for multiple HDDs sharing one device

**Write-Intensive NVMe (best):**
- TBW: 10+ PB for 3 DWPD rating
- Models: Intel P5800X, Samsung PM9A3 (3 DWPD), Micron 9300 MAX
- Best for NVMe OSD clusters or heavy mixed workloads

## Step 4 - Performance Requirements

```bash
# Minimum performance for WAL/DB serving 12 HDDs:
# - Random write IOPS: > 50K (sync writes)
# - Sequential write bandwidth: > 1 GB/s
# - Read latency: < 200 microseconds

# Benchmark a candidate SSD
fio --name=randwrite --ioengine=libaio --iodepth=32 \
  --rw=randwrite --bs=4k --direct=1 \
  --size=10g --filename=/dev/nvme0n1 --runtime=60 --time_based

fio --name=seqwrite --ioengine=libaio --iodepth=8 \
  --rw=write --bs=128k --direct=1 \
  --size=10g --filename=/dev/nvme0n1 --runtime=60 --time_based
```

## Step 5 - Check Drive Health Over Time

```bash
# Monitor NVMe wear indicator
nvme smart-log /dev/nvme0n1 | grep -E "percentage_used|data_units"

# Set alert when percentage_used exceeds 70%
WEAR=$(nvme smart-log /dev/nvme0n1 --output-format=json | \
  jq -r '.percentage_used')
echo "NVMe wear: ${WEAR}%"
```

## Step 6 - Partitioning Strategy

```bash
# Partition a 1 TB NVMe for 12 HDDs
# DB: 64 GB per HDD = 768 GB total
# WAL: 1 GB per HDD = 12 GB total
# System/OS: remaining space

# Using gdisk
gdisk /dev/nvme0n1 <<EOF
n
1

+768G
8300
n
2

+12G
8300
w
Y
EOF
```

## SSD Recommendations by Workload

```yaml
light_load:  # < 6 HDDs per SSD
  type: "Enterprise SATA SSD"
  example: "Samsung SM883 or Seagate Nytro"
  min_tbw: "1 PB"

moderate_load:  # 6-12 HDDs per SSD
  type: "Enterprise NVMe"
  example: "Samsung PM9A3 or Kioxia CD8"
  min_tbw: "3 PB"

heavy_load:  # NVMe OSD cluster or 12+ HDDs per SSD
  type: "Write-intensive NVMe"
  example: "Micron 9300 MAX or Intel P5800X"
  min_tbw: "10 PB+"
```

## Summary

Selecting appropriate SSDs for Ceph WAL and DB requires calculating actual write amplification from your expected workload and matching it to the SSD's TBW endurance rating with a safety margin. Enterprise NVMe drives with 3+ PB TBW ratings are the minimum recommendation for moderate workloads. Monitoring wear indicators via NVMe SMART data lets you replace drives proactively before they exhaust their endurance.

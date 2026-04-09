# How to Optimize Ceph for Lowest Cost Per TB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Cost Optimization, Storage, Hardware, Capacity

Description: Strategies to minimize Ceph cost per usable TB through drive selection, EC profiles, compression, and cluster sizing decisions.

---

## The Cost-Per-TB Formula

Effective cost per TB combines hardware, amortization, and operational overhead:

```bash
# Cost per usable TB = (Hardware / Usable TB) + (Annual OpEx / TB / 12)
#
# Example:
# Hardware: $80,000 for 160 TB usable = $500/TB upfront
# Amortized over 5 years: $100/TB/year = $8.33/TB/month
# OpEx (staff + power): $6,500/month / 160 TB = $40.63/TB/month
# Total: ~$49/TB/month
```

## Choose the Right Drive Size

Larger drives have lower cost per TB:

```bash
# Compare $/TB for common HDD sizes
# 4 TB SATA HDD: ~$60 = $15/TB
# 8 TB SATA HDD: ~$90 = $11.25/TB
# 16 TB SATA HDD: ~$150 = $9.38/TB
# 20 TB SATA HDD: ~$180 = $9/TB

# Always buy the largest drives that fit your budget
# A node with 12x 20 TB drives = 240 TB raw at lower $/TB
```

## Use EC Profiles for Cold Data

```bash
# 3x replication: 1 TB usable = 3 TB raw
# EC k=4,m=2:    1 TB usable = 1.5 TB raw
# EC k=8,m=3:    1 TB usable = 1.375 TB raw

# For 100 TB usable with large drives:
# Replication: 300 TB raw x $9/TB = $2,700 in drives
# EC 4+2:      150 TB raw x $9/TB = $1,350 in drives
# EC 8+3:      138 TB raw x $9/TB = $1,237 in drives
```

## Enable Compression on Suitable Pools

```bash
ceph osd pool set cold-data compression_mode aggressive
ceph osd pool set cold-data compression_algorithm zstd

# If your data compresses 2:1, this doubles effective capacity
# Equivalent to halving $/TB cost
```

## Optimize Node Density

Fewer, denser nodes reduce per-node overhead costs:

```bash
# Option A: 20 nodes x 6 drives = 120 drives
# - 20x server hardware costs
# - 20x power supplies, fans, RAM
# - Higher per-TB hardware cost

# Option B: 10 nodes x 12 drives = 120 drives
# - 10x server hardware costs
# - Lower per-TB total cost

# Rule: maximize drives per node up to OSD:CPU ratio limit
# Recommended: 1 CPU core per 2-3 HDDs, 1 core per NVMe
```

## Right-Size RAM Per OSD

```bash
# BlueStore default cache: 1 GB per OSD
# For 12 OSDs per node: 12 GB minimum for caches
# Add OS + Kubernetes overhead: 4-8 GB
# Recommended: 64 GB RAM per node with 12 HDDs

# Over-buying RAM wastes money
# Under-buying RAM causes cache thrashing and poor performance
ceph config get osd bluestore_cache_size
```

## Eliminate Idle Capacity with Tiering Awareness

Use the Ceph CLI to identify over-provisioned pools:

```bash
# Pools using less than 20% of their max_bytes
ceph df detail --format json | python3 -c "
import json, sys
d = json.load(sys.stdin)
for pool in d['pools']:
    quota = pool['stats'].get('quota_bytes', 0)
    used = pool['stats']['bytes_used']
    if quota > 0 and used / quota < 0.2:
        print(f\"{pool['name']}: {used/(1024**3):.1f}GB used of {quota/(1024**3):.0f}GB quota\")
"
```

## Summary

Minimizing Ceph cost per TB requires combining the right hardware (large drives, dense nodes), efficient data protection (EC for cold data), and inline compression for compressible workloads. Each optimization layer compounds - EC plus compression can reduce effective cost per TB by 60-70% compared to naive 3x replicated, uncompressed deployments.

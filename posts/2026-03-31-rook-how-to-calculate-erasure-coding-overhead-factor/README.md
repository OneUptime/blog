# How to Calculate Erasure Coding Overhead Factor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Erasure Coding, Storage Efficiency, Capacity Planning

Description: Calculate the actual storage overhead factor for Ceph erasure coding profiles to plan raw capacity requirements and compare against replication strategies.

---

## Understanding the Overhead Factor

The erasure coding overhead factor tells you how much raw storage is needed to store 1 byte of usable data. A factor of 1.5x means 1 TiB of data requires 1.5 TiB of raw OSD capacity.

For an erasure coding profile with `k` data chunks and `m` parity chunks:

```text
overhead_factor = (k + m) / k
```

## Calculating Overhead for Common Profiles

```text
EC Profile  | k | m | Total Chunks | Overhead Factor | Usable % of Raw
4+2         | 4 | 2 | 6            | 6/4 = 1.5x      | 66.7%
6+2         | 6 | 2 | 8            | 8/6 = 1.33x     | 75%
6+3         | 6 | 3 | 9            | 9/6 = 1.5x      | 66.7%
8+2         | 8 | 2 | 10           | 10/8 = 1.25x    | 80%
8+3         | 8 | 3 | 11           | 11/8 = 1.375x   | 72.7%
8+4         | 8 | 4 | 12           | 12/8 = 1.5x     | 66.7%
10+4        | 10| 4 | 14           | 14/10 = 1.4x    | 71.4%
12+4        | 12| 4 | 16           | 16/12 = 1.33x   | 75%
```

Compare with replication:

```text
Replication | Overhead | Usable %
2x          | 2.0x     | 50%
3x          | 3.0x     | 33.3%
```

## Calculating Raw Capacity Requirements

To determine raw disk capacity needed:

```bash
# Formula
raw_capacity = usable_capacity * overhead_factor

# Example: Need 100 TiB usable with 6+2 EC profile
# overhead_factor = 8/6 = 1.33
# raw_capacity = 100 * 1.33 = 133 TiB raw
```

Using Python:

```python
def ec_overhead(k, m):
    overhead_factor = (k + m) / k
    usable_pct = (k / (k + m)) * 100
    return overhead_factor, usable_pct

# Example calculations
for k, m in [(4,2), (6,2), (8,2), (8,3)]:
    factor, pct = ec_overhead(k, m)
    print(f"EC {k}+{m}: overhead={factor:.3f}x, usable={pct:.1f}%")
```

Output:

```text
EC 4+2: overhead=1.500x, usable=66.7%
EC 6+2: overhead=1.333x, usable=75.0%
EC 8+2: overhead=1.250x, usable=80.0%
EC 8+3: overhead=1.375x, usable=72.7%
```

## Verifying with Ceph Commands

Check actual storage efficiency of an existing EC pool:

```bash
# View pool stats including raw usage
ceph df detail

# Per-pool breakdown showing stored vs raw used
rados df
```

Expected output shows `STORED` (logical bytes) vs `USED` (raw bytes on disk) per pool - the ratio reflects overhead.

## Accounting for Additional Overhead

The formula above gives theoretical overhead. Real-world overhead is slightly higher due to:

1. **Metadata overhead**: BlueStore stores chunk metadata
2. **Alignment padding**: Stripe units may not align perfectly with object sizes
3. **Pool PG overhead**: PG metadata uses small amounts of space

Add 5-10% margin to your capacity calculations:

```text
practical_raw_capacity = usable_capacity * overhead_factor * 1.05
```

## Choosing a Profile Based on Capacity Budget

If you have a fixed raw capacity and need to maximize usable space:

```text
80 TiB raw with different EC profiles:
  4+2 (1.5x): 80 / 1.5 = 53.3 TiB usable
  6+2 (1.33x): 80 / 1.33 = 60.2 TiB usable
  8+2 (1.25x): 80 / 1.25 = 64 TiB usable
```

Higher k values give better efficiency but require more OSDs (at least k+m OSDs, ideally k+m per failure domain).

## Minimum OSD Requirements

The EC profile requires at least k+m OSDs to function. For fault tolerance, you need:

```text
minimum OSDs = k + m
recommended OSDs = k + m + spare (at least 1 extra per site)
```

```bash
# Verify your cluster has enough OSDs for a profile
ceph osd stat
# Number of OSDs must be >= k + m
```

## Summary

The erasure coding overhead factor is simply `(k+m)/k`, which determines how much raw capacity is needed per unit of usable storage. Common profiles range from 1.25x (8+2) to 1.5x (4+2), all significantly better than 3x replication. When planning capacity, add 5-10% practical overhead for metadata and alignment, and ensure you have at least k+m OSDs available for the EC profile to function correctly.

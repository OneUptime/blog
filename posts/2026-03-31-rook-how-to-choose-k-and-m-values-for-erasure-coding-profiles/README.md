# How to Choose K and M Values for Erasure Coding Profiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Erasure Coding, Capacity Planning, Storage Design

Description: Select the right K and M values for Ceph erasure coding profiles by balancing fault tolerance, storage efficiency, OSD count, and CPU overhead.

---

## Understanding K and M

In Ceph erasure coding:
- **K** = number of data chunks (how many pieces your data is split into)
- **M** = number of parity/coding chunks (how many OSDs you can lose without data loss)

The total number of OSDs used per object is K+M. You need at least K+M OSDs in your failure domain to use a given profile.

## Key Trade-offs

```text
Higher K:
  + Better storage efficiency (less overhead)
  + Higher sequential read throughput (parallel reads across more OSDs)
  - Requires more OSDs
  - Higher CPU overhead for encoding/decoding
  - Slower recovery (need to read more chunks)

Higher M:
  + More fault tolerance (survive more OSD failures)
  - More storage overhead
  - Higher CPU overhead
  - More OSDs required
```

## Minimum OSD Requirements

```text
Profile | K | M | Min OSDs | Failure Tolerance
2+1     | 2 | 1 | 3        | 1 OSD
4+2     | 4 | 2 | 6        | 2 OSDs
6+2     | 6 | 2 | 8        | 2 OSDs
6+3     | 6 | 3 | 9        | 3 OSDs
8+2     | 8 | 2 | 10       | 2 OSDs
8+3     | 8 | 3 | 11       | 3 OSDs
8+4     | 8 | 4 | 12       | 4 OSDs
```

## Common Profiles and Their Use Cases

### 4+2 - General Purpose

Good balance of efficiency, fault tolerance, and OSD count:

```bash
ceph osd erasure-code-profile set ec-4-2 \
  k=4 m=2 \
  plugin=jerasure \
  technique=reed_sol_van

# Use case: mid-size clusters (6-20 nodes), object storage
```

### 6+2 - Storage Efficiency Focus

Better efficiency (1.33x overhead) with same fault tolerance as 4+2:

```bash
ceph osd erasure-code-profile set ec-6-2 \
  k=6 m=2 \
  plugin=jerasure \
  technique=reed_sol_van

# Use case: larger clusters (8+ nodes), bulk cold storage
```

### 8+3 - Maximum Efficiency with High Tolerance

Very efficient (1.375x) with tolerance for 3 OSD failures:

```bash
ceph osd erasure-code-profile set ec-8-3 \
  k=8 m=3 \
  plugin=jerasure \
  technique=reed_sol_van

# Use case: large clusters (11+ nodes), archive storage, compliance
```

### 2+1 - Small Clusters

Minimum viable EC with only 3 OSDs needed:

```bash
ceph osd erasure-code-profile set ec-2-1 \
  k=2 m=1 \
  plugin=jerasure \
  technique=reed_sol_van

# Use case: small clusters, development/test, limited hardware
```

## Decision Matrix

```text
Cluster Size   | Fault Tolerance | Recommended Profile
< 6 OSDs       | 1 OSD           | Use 3x replication instead
6-10 OSDs      | 2 OSDs          | 4+2
8-12 OSDs      | 2 OSDs          | 6+2
10-15 OSDs     | 2-3 OSDs        | 6+2 or 6+3
15-20 OSDs     | 3 OSDs          | 8+3
20+ OSDs       | 4 OSDs          | 8+4 or 10+4
```

## Choosing M Based on Failure Domain

If using host-level failure domains, M must be at least as large as the number of hosts you want to survive:

```bash
# Profile for surviving 2 host failures
ceph osd erasure-code-profile set host-2-fault \
  k=6 m=2 \
  plugin=jerasure \
  technique=reed_sol_van \
  crush-failure-domain=host

# Profile for surviving 1 rack failure (multi-rack cluster)
ceph osd erasure-code-profile set rack-1-fault \
  k=4 m=1 \
  plugin=jerasure \
  technique=reed_sol_van \
  crush-failure-domain=rack
```

## CPU and Recovery Overhead

Larger K values increase CPU overhead during encoding and recovery:

```text
Profile | Relative CPU Overhead | Recovery Read Requirement
4+2     | Low                   | Read 4 chunks (K)
6+2     | Medium                | Read 6 chunks (K)
8+3     | Higher                | Read 8 chunks (K)
```

Use hardware-accelerated encoding for large K values:

```bash
# ISA plugin on Intel hardware
ceph osd erasure-code-profile set ec-8-3-hw \
  k=8 m=3 \
  plugin=isa \
  technique=reed_sol_van
```

## Verifying and Testing Profiles

```bash
# List configured profiles
ceph osd erasure-code-profile ls

# Get profile details
ceph osd erasure-code-profile get ec-4-2

# Create a test pool and benchmark
ceph osd pool create test-ec-pool 64 64 erasure ec-4-2
rados bench -p test-ec-pool 30 write -t 4 -b 4M --no-cleanup
rados bench -p test-ec-pool 30 seq -t 4
rados -p test-ec-pool cleanup
```

## Summary

Choosing K and M for Ceph erasure coding involves balancing cluster size, fault tolerance requirements, storage efficiency, and CPU capacity. A 4+2 profile is the most common starting point, offering 2 OSD fault tolerance at 1.5x overhead with only 6 OSDs required. For larger clusters seeking better efficiency, 6+2 (1.33x overhead) or 8+3 (1.375x overhead, 3 OSD tolerance) are excellent choices. Always ensure you have at least K+M OSDs per failure domain before deploying a profile.

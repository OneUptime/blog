# How to Configure min_size for Erasure Coded Pool Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Erasure Coding, min_size, Data Recovery

Description: Configure the min_size parameter for erasure coded pools to control when Ceph allows I/O during degraded states and balance availability against data safety.

---

## What Is min_size

The `min_size` parameter controls the minimum number of OSDs that must be available for a pool to accept write operations. For an erasure coded pool with profile k+m:

- `size` = k + m (total chunks: data + parity)
- `min_size` = minimum chunks available to allow writes (must be >= k)

When the acting OSD set drops below `min_size`, the PG goes `peering` and blocks I/O until enough OSDs are available.

## Default min_size Values

For a 4+2 EC profile (size=6):

```bash
# Check current min_size
ceph osd pool get my-ec-pool min_size

# Default is usually k+1 = 5 for a 4+2 profile
# This means you can lose 1 OSD before writes are blocked
```

## Setting min_size

```bash
# For a 4+2 EC pool (k=4, m=2)

# Conservative: require all m parity shards (most durable)
ceph osd pool set my-ec-pool min_size 5  # k+1, lose 1 OSD max

# Moderate: allow writes with minimum recovery capability
ceph osd pool set my-ec-pool min_size 4  # == k, data is recoverable but no parity

# Aggressive: allow writes with degraded parity (RISKY)
ceph osd pool set my-ec-pool min_size 3  # below k, NOT RECOMMENDED
```

## Understanding the Safety Implications

The relationship between min_size and data safety:

```text
EC Profile | size | k | m | min_size | Meaning
4+2        | 6    | 4 | 2 | 6        | All chunks required (no fault tolerance during writes)
4+2        | 6    | 4 | 2 | 5        | Can lose 1 OSD while writing (1 parity available)
4+2        | 6    | 4 | 2 | 4        | Can lose 2 OSDs while writing (no fault tolerance margin)
4+2        | 6    | 4 | 2 | 3        | UNSAFE: cannot reconstruct if another OSD fails
```

Setting `min_size` below `k` means that if another OSD fails while writing, data could be permanently lost. Never set `min_size < k`.

## Recommended min_size Values

```bash
# For a 4+2 EC pool (size=6, set by profile) - recommended min_size: 5
ceph osd pool set my-ec-pool min_size 5

# For a 6+3 EC pool (size=9, set by profile) - recommended min_size: 7
ceph osd pool set my-ec-pool min_size 7

# For a 8+2 EC pool (size=10, set by profile) - recommended min_size: 9
ceph osd pool set my-ec-pool min_size 9
```

## min_size During Recovery Scenarios

When an OSD fails, Ceph behavior depends on min_size:

```text
Scenario: 4+2 pool, osd.3 fails

With min_size=5:
  - Acting set has 5 OSDs (5 of the 6 data+parity shards)
  - Writes continue (acting set meets min_size=5)
  - Recovery proceeds in background

With min_size=6 (same as size):
  - Acting set has 5 OSDs
  - Pool goes peering, writes BLOCKED
  - Recovery must complete before writes resume
```

## Checking PG Status During Degraded State

```bash
# See how many PGs are below min_size
ceph health detail | grep min_size

# List PGs that are degraded but active
ceph pg dump | grep "active+degraded"

# View acting set size for a specific PG
ceph pg <pgid> query | jq '.acting | length'
```

## Stretch Cluster min_size Behavior

In stretch cluster mode, Ceph automatically adjusts min_size to account for site failures:

```bash
# In stretch mode, min_size is typically set to allow site failure
ceph osd pool get stretch-pool min_size
# Often set to 1 (so the surviving site can continue serving I/O)
```

## Temporarily Lowering min_size for Emergency Recovery

In rare cases where a cluster is stuck and you need to force recovery (last resort only):

```bash
# Lower min_size temporarily (use with caution)
ceph osd pool set my-ec-pool min_size 3

# Wait for PGs to become active (they should activate automatically)
ceph pg dump | grep "active+degraded"

# Restore after recovery
ceph osd pool set my-ec-pool min_size 5
```

## Summary

The `min_size` parameter for EC pools defines the minimum number of available OSD shards required for writes. For a k+m erasure coding profile, `min_size` should be set to at least `k` (to ensure data can always be reconstructed) and ideally `k+1` (to maintain at least one parity chunk during writes). Setting `min_size` below `k` creates a data loss risk and should be avoided. The right balance between availability and durability depends on your failure tolerance requirements.

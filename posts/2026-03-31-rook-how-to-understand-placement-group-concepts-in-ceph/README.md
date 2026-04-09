# How to Understand Placement Group Concepts in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Storage, Placement Group, Distributed Storage

Description: Understand core Ceph placement group concepts including how PGs map objects to OSDs, how PG count affects performance, and how to size PGs correctly.

---

## What Are Placement Groups

Ceph does not store objects directly on individual OSDs. Instead, it uses an intermediate abstraction called Placement Groups (PGs). Each object is hashed into a PG, and each PG is then mapped to a set of OSDs by the CRUSH algorithm. This two-level indirection allows Ceph to balance data efficiently without tracking every object location individually.

```text
Object -> (hash mod pg_num) -> PG -> (CRUSH map) -> OSD set
```

## Why Placement Groups Exist

Without PGs, Ceph would need to track where every individual object lives as OSDs are added or removed. With millions or billions of objects, this would be impractical. PGs act as buckets: when an OSD is added, only some PGs are remapped rather than all objects being individually relocated.

Key benefits of the PG model:
- Efficient rebalancing when cluster topology changes
- Parallel recovery after OSD failures
- Decoupled object placement from physical OSD mapping

## PG Count and Pool Configuration

Every pool has a fixed number of PGs, configured at creation time (though it can be adjusted later with autoscaling). Too few PGs leads to uneven distribution; too many wastes memory.

```bash
# Create a pool with explicit PG count
ceph osd pool create mypool 128

# View the PG count for all pools
ceph osd pool ls detail
```

## How Objects Map to PGs

Ceph uses a hash of the object name modulo `pg_num` to determine which PG holds the object. The pool ID is combined with this hash result to form the full PG identifier:

```bash
# Find which PG an object belongs to
ceph osd map <pool-name> <object-name>
```

Example output:

```text
osdmap e42 pool 'mypool' (1) object 'myobject' -> pg 1.a8b2c3d4 (1.14) -> up ([2,0,1], p2) acting ([2,0,1], p2)
```

This shows the object maps to PG `1.14`, which is currently mapped to OSDs 2, 0, and 1 with OSD 2 as primary.

## PG vs PGP

Ceph has two pool parameters: `pg_num` and `pgp_num`.

- `pg_num`: Total number of PGs. Splitting PGs increases parallelism.
- `pgp_num`: Number of PGs considered for placement (used by CRUSH). This should normally equal `pg_num`.

```bash
# Check PG and PGP numbers
ceph osd pool get mypool pg_num
ceph osd pool get mypool pgp_num

# After changing pg_num, update pgp_num to match
ceph osd pool set mypool pgp_num 256
```

## PG Autoscaler

Ceph Nautilus introduced the PG autoscaler, which automatically adjusts PG counts based on pool usage. This is now the recommended approach.

```bash
# Check autoscaler status
ceph osd pool autoscale-status

# Enable autoscaler for a pool
ceph osd pool set mypool pg_autoscale_mode on

# Set a target size hint (helps autoscaler decide)
ceph osd pool set mypool target_size_bytes 1099511627776  # 1 TiB
```

## Recommended PG Count Guidelines

As a rule of thumb, aim for 100-200 PGs per OSD across all pools:

```text
Total PGs = (OSDs * 100) / replication_factor

For a 10-OSD cluster with 3x replication:
Total PGs = (10 * 100) / 3 = ~333

Distribute across pools proportionally by expected usage.
```

## PG Splitting and Merging

When you increase `pg_num`, Ceph splits existing PGs. When you decrease it (Nautilus+), Ceph merges PGs. Both operations cause temporary data movement.

```bash
# Increase PG count (splitting)
ceph osd pool set mypool pg_num 256

# Monitor the split progress
ceph -s
watch -n 2 ceph pg stat
```

## Summary

Placement Groups are the fundamental unit of data distribution in Ceph, acting as an intermediate layer between objects and OSDs. Choosing the right PG count balances cluster performance, memory usage, and recovery speed. The PG autoscaler simplifies this by dynamically adjusting PG counts based on actual pool usage, making it the preferred approach for modern Ceph deployments.

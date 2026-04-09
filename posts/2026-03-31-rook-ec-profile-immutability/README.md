# How to Understand Profile Immutability After Creation in Erasure Coding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, ErasureCoding, Storage, Planning

Description: Learn why Ceph erasure code profiles are immutable after being assigned to a pool, what can be changed, and how to migrate data when you need different EC parameters.

---

Once a Ceph erasure code profile is assigned to a pool, the profile cannot be modified in ways that would change the layout of existing data. This immutability is a fundamental design constraint, not a limitation - it protects data integrity by ensuring that the recovery math remains consistent for all objects in the pool.

## Why Profiles Are Immutable

An erasure code profile defines how data is split across shards. Every object in the pool has its chunks stored according to those parameters. If you could change `k`, `m`, or `stripe_unit` after data is written:

- Existing objects would be unreadable because the recovery math would no longer match
- Recovery from shard loss would produce garbage data
- The cluster would have no way to know which objects used the old profile vs the new one

## What Cannot Be Changed

After a profile is assigned to a pool, these parameters are locked:

```text
Locked Parameters (per-profile):
  k              (data chunk count)
  m              (coding chunk count)
  stripe_unit    (chunk size in bytes)
  technique      (reed_sol_van, cauchy_good, etc.)
  plugin         (jerasure, isa)
  w              (GF word size)
```

Attempting to modify these after assignment:

```bash
ceph osd erasure-code-profile set existing-profile k=6 m=3
```

Output:

```text
Error EPERM: will not override erasure code profile existing-profile
```

You must delete and recreate the profile - but only if no pool is using it.

## What Can Be Changed

Pool-level settings (not profile-level) can be changed even after data is written:

```bash
# These are pool properties, not profile properties - can be changed
ceph osd pool set ec-pool min_size 5
ceph osd pool set ec-pool pg_num 128
ceph osd pool set ec-pool pg_autoscale_mode on
ceph osd pool set ec-pool allow_ec_overwrites true
ceph osd pool set ec-pool compression_algorithm snappy
```

CRUSH rules can also be updated, though this triggers data movement.

## Deleting an Unused Profile

If a profile is not yet assigned to any pool, it can be deleted:

```bash
ceph osd erasure-code-profile rm old-profile
```

If a pool uses the profile:

```text
Error EBUSY: erasure code profile 'old-profile' cannot be removed as it is referenced by pool 'my-pool'
```

## Migration Strategy When You Need Different Parameters

To change EC parameters for a live pool:

```bash
# 1. Create a new profile with desired parameters
ceph osd erasure-code-profile set new-profile k=8 m=3 plugin=jerasure technique=reed_sol_van

# 2. Create a new pool with the new profile
ceph osd pool create new-ec-pool 128 128 erasure new-profile

# 3. Migrate data using rados cppool or application-level copy
rados cppool old-ec-pool new-ec-pool

# 4. Update applications to use new pool

# 5. Delete old pool after verification
ceph osd pool delete old-ec-pool old-ec-pool --yes-i-really-really-mean-it
```

For Kubernetes workloads using Rook, migration involves creating a new StorageClass and migrating PVCs.

## Rook Profile Planning

In Rook, EC profiles are set at CephBlockPool creation time. Plan carefully:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ec-pool-final
  namespace: rook-ceph
spec:
  erasureCoded:
    dataChunks: 4    # Cannot change without migration
    codingChunks: 2  # Cannot change without migration
```

## Pre-Creation Checklist

Before creating an EC pool, confirm:

1. Enough OSD hosts exist for the failure domain (`k + m` hosts minimum)
2. Stripe unit is appropriate for your workload I/O size
3. k and m values match your fault tolerance and efficiency requirements
4. Plugin is installed on all OSD nodes (ISA-L if using `plugin=isa`)

## Summary

Erasure code profiles are immutable once assigned to a pool because changing the encoding parameters would make existing data unreadable. Only pool-level settings like `min_size`, `pg_num`, and compression can be changed after creation. Plan your k, m, stripe_unit, and plugin values carefully before creating production pools, as changing them requires a full data migration to a new pool.

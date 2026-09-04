# How to Estimate Stranded Capacity When Erasure Coding Uses Mixed-Size Drives

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MinIO, Erasure Coding, Storage, Capacity Planning, Distributed Storage

Description: Calculate MinIO capacity lost to mixed-size drives separately from parity overhead, then verify the estimate against live pool and erasure-set metrics.

---

In a MinIO server pool, the smallest drive sets the usable-capacity ceiling for every other drive. A larger replacement or a few oversized disks therefore do not increase that pool's effective raw capacity. Their extra bytes are stranded before erasure-code parity, metadata, versions, or operational free-space reserves are considered.

Separate these costs. Calling every nonlogical byte parity overhead hides a hardware-sizing problem.

## Calculate Size Mismatch First

For one server pool with drive capacities `C1...Cn`, let:

```text
Cmin = minimum(C1...Cn)
physical raw capacity = sum(Ci)
effective raw capacity = n * Cmin
size-stranded capacity = sum(Ci - Cmin)
```

Then apply the erasure-code ratio. For an `N = K + M` layout at full-stripe efficiency:

```text
estimated logical capacity = effective raw * K / N
parity capacity            = effective raw * M / N
installed efficiency       = estimated logical / physical raw
```

Calculate each server pool separately because each can have a different minimum drive and layout, then sum the resulting logical estimates.

## Work an Example

Consider a 16-drive pool with twelve 8 TiB drives and four 16 TiB drives using `EC:4`, so `K = 12` and `N = 16`:

```text
physical raw       = (12 * 8) + (4 * 16) = 160 TiB
smallest drive     = 8 TiB
effective raw      = 16 * 8 = 128 TiB
size stranded      = 160 - 128 = 32 TiB
estimated logical  = 128 * 12 / 16 = 96 TiB
parity allocation  = 128 * 4 / 16 = 32 TiB
installed efficiency = 96 / 160 = 60%
```

The pool has 32 TiB stranded by size mismatch and another estimated 32 TiB used for parity. Saying only that `EC:4` is 75% efficient misses why the installed hardware delivers 60% logical efficiency.

This is a planning estimate for full stripes. Real available space will be lower because of metadata, filesystem allocation, object tails, multipart state, versions, delete markers, and the free-space margin needed for safe operation.

## Inventory the Real Hardware

On every node, capture stable device identity and byte capacity:

```bash
lsblk -b -d \
  -o NAME,SERIAL,MODEL,SIZE,FSTYPE

findmnt -t xfs \
  -o SOURCE,TARGET,FSTYPE,OPTIONS
```

Map each mount to its MinIO server pool. Do not use marketing decimal TB values in one row and binary TiB values in another. Perform the calculation in bytes, then render a human-readable unit at the end.

Query MinIO through supported interfaces:

```bash
mc admin info --uncached production
mc admin prometheus metrics production cluster --api-version v3 \
  >/tmp/minio-cluster-capacity.prom
mc admin prometheus metrics production system --api-version v3 \
  >/tmp/minio-system-capacity.prom
```

Do not run `du` against backend object directories or infer object ownership from individual shard files. MinIO requires exclusive access to those paths, and backend sizes are not the logical S3 namespace.

## Account for the Actual Parity of Objects

Inspect storage-class configuration:

```bash
mc admin config get production storage_class
mc admin info production
```

Parity changes affect only newly written objects. Existing objects retain the parity assigned when they were created, so a long-lived pool can contain several storage ratios. Current AIStor releases can also upgrade parity for objects written during a degraded event; those objects keep the higher parity after healing and consume extra capacity.

Versioning and object retention multiply logical versions before erasure coding is applied. Estimate the retained-version distribution rather than multiplying only the current object size.

For planning, model cohorts:

| Cohort | Logical bytes | Data `K` | Parity `M` | Estimated stored bytes |
| --- | ---: | ---: | ---: | ---: |
| Standard historical | `L1` | 12 | 4 | `L1 * 16/12` |
| Standard degraded-write upgrade | `L2` | 10 | 6 | `L2 * 16/10` |
| Reduced redundancy | `L3` | policy-specific | policy-specific | `L3 * N/K` |

Add object and filesystem overhead based on a measured sample, not a guessed universal percentage.

## Understand What a Larger Replacement Does

MinIO's drive-recovery documentation requires replacement media to have equal or greater capacity and states that a larger drive does not expand cluster capacity. The smallest drive still caps the server pool.

Replacing one 8 TiB disk with 16 TiB in the example increases physical raw capacity by 8 TiB but leaves effective raw and estimated logical capacity unchanged. It increases stranded capacity by 8 TiB.

To gain usable capacity, deploy a supported expansion with a properly sized new server pool or replace the limiting devices as part of a complete, documented hardware transition. Do not resize MinIO backend filesystems, change erasure-set parameters, or add individual drives to an initialized layout by improvisation.

## Add an Operational Reserve

Never plan to consume the mathematical maximum. Reserve space for:

- healing and temporary state;
- parity upgrades during degraded writes;
- object versions and incomplete multipart uploads;
- growth between expansion windows;
- uneven placement and per-set fullness;
- rollback copies during migrations.

MinIO's deployment guidance recommends planning capacity well ahead of need rather than performing just-in-time expansion. Alert on the fullest drive and set, not only aggregate free capacity; one constrained set can reject writes while other hardware remains emptier.

## Conclusion

Estimate mixed-drive waste before applying EC efficiency: cap every drive in a server pool at that pool's smallest member, sum the excess as stranded, and then calculate parity on the effective raw capacity. Validate the model against live metrics and object cohorts. Homogeneous drives per pool make both capacity and failure planning far more predictable.

## Official Documentation

- [MinIO AIStor: Recover After Drive Failure](https://docs.min.io/aistor/operations/failure-and-recovery/recover-after-drive-failure/)
- [MinIO AIStor: Erasure Coding](https://docs.min.io/aistor/operations/core-concepts/erasure-coding/)
- [MinIO AIStor: Erasure Code Settings](https://docs.min.io/aistor/reference/aistor-server/settings/storage-class/)
- [MinIO AIStor: Expand Available Storage](https://docs.min.io/aistor/operations/scaling/)
- [MinIO Erasure Code Calculator](https://min.io/product/erasure-code-calculator)

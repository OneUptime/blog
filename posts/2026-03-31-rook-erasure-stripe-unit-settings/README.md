# How to Configure Stripe Unit Settings for Erasure Coding in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, ErasureCoding, Storage, Performance

Description: Learn how to configure the stripe_unit parameter in Ceph erasure code profiles to optimize I/O performance for your specific workload and object size patterns.

---

The `stripe_unit` parameter in a Ceph erasure code profile defines the size of each data chunk stripe written to an OSD. This setting directly influences I/O alignment, write amplification, and throughput. Choosing the right stripe unit is critical for workloads with predictable I/O patterns.

## What Is stripe_unit?

When Ceph writes an object using erasure coding with k data chunks, the object is split into stripes. Each stripe is divided into k data chunks of size `stripe_unit`. A full stripe therefore has a logical size of `k * stripe_unit`. The coding (parity) chunks are computed per stripe.

Default value: `4096` bytes (4 KiB).

## Setting stripe_unit in a Profile

```bash
ceph osd erasure-code-profile set ec-large-stripe \
  plugin=jerasure \
  technique=reed_sol_van \
  k=4 \
  m=2 \
  stripe_unit=65536
```

This creates a profile with 64 KiB chunks, resulting in a 256 KiB logical stripe (4 x 64 KiB).

## Impact on Performance

A larger stripe unit reduces the number of RADOS operations required to write large objects but increases write amplification for small objects. A smaller stripe unit reduces amplification for small I/O but increases the number of OSD operations for large objects:

```text
stripe_unit   Logical stripe (k=4)   Best for
4096          16 KiB                 Small objects, random I/O
32768         128 KiB                General purpose
65536         256 KiB                Large sequential writes (RGW)
1048576       4 MiB                  Archival / bulk storage
```

## Alignment with RGW Multipart Uploads

When using RGW (Ceph Object Gateway) for S3-compatible storage, multipart upload part sizes should be aligned to the logical stripe size. If your stripe unit is 64 KiB with k=4, each RADOS object stripe is 256 KiB. Setting RGW multipart chunk size to a multiple of 256 KiB reduces partial stripe writes:

```ini
[client.rgw]
rgw_obj_stripe_size = 262144
```

## Verifying the Stripe Unit

```bash
ceph osd erasure-code-profile get ec-large-stripe
```

Output:

```text
crush_failure_domain=host
k=4
m=2
plugin=jerasure
stripe_unit=65536
technique=reed_sol_van
```

## Creating a Pool with the Profile

```bash
ceph osd pool create ec-large-data 64 64 erasure ec-large-stripe
ceph osd pool application enable ec-large-data rgw
```

In Rook, the CephBlockPool CRD supports erasure coding but auto-generates the erasure code profile from the spec. It does not support specifying a custom `stripe_unit` or referencing an externally created profile:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ec-large-pool
  namespace: rook-ceph
spec:
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
```

To use a custom `stripe_unit` with Rook, create the erasure code profile and pool directly via the Rook toolbox using the Ceph CLI commands shown above, bypassing the CRD.

## Immutability Constraint

Once an erasure code profile is created and assigned to a pool, neither the profile nor the stripe_unit can be changed. If you need to modify the stripe unit, you must:

1. Create a new profile with the desired `stripe_unit`
2. Create a new pool using the new profile
3. Migrate data to the new pool
4. Delete the old pool

Plan your stripe unit carefully before creating production pools.

## Summary

The `stripe_unit` parameter controls how data is chunked across OSD devices in erasure coded pools. Large stripe units improve throughput for large sequential workloads (RGW archival), while small stripe units reduce write amplification for random small I/O. Always plan and test your stripe unit setting before production deployment, as it cannot be changed after pool creation.

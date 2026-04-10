# How to Configure Erasure Code Profiles in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Storage, Kubernetes, Erasure Coding

Description: Learn how to create, modify, and manage erasure code profiles in Ceph to control data protection, storage efficiency, and CRUSH placement.

---

## What Is an Erasure Code Profile

An erasure code profile in Ceph is a named configuration object that defines the parameters used when creating an erasure coded pool. The profile specifies how many data chunks (`k`), how many parity chunks (`m`), which plugin to use, which technique to apply, and which CRUSH properties govern data placement.

A single profile can be reused across multiple pools, and changing a profile after pools reference it has no effect - the pool retains the settings it was created with. To change the profile of an existing pool, you must create a new pool with a new profile and migrate data.

## Listing Existing Profiles

To see all profiles defined in the cluster:

```bash
ceph osd erasure-code-profile ls
```

To view the details of the default profile:

```bash
ceph osd erasure-code-profile get default
```

Output typically shows:

```text
k=2
m=2
plugin=jerasure
technique=reed_sol_van
```

## Creating a Custom Profile

Use `ceph osd erasure-code-profile set` to define a new profile:

```bash
ceph osd erasure-code-profile set production-ec \
  k=4 \
  m=2 \
  plugin=jerasure \
  technique=reed_sol_van \
  crush-failure-domain=host \
  crush-device-class=hdd
```

Key parameters:

| Parameter | Description |
|---|---|
| `k` | Number of data chunks |
| `m` | Number of parity chunks |
| `plugin` | Erasure code plugin (jerasure, isa, lrc, shec) |
| `technique` | Algorithm within plugin |
| `crush-failure-domain` | OSD grouping for fault tolerance |
| `crush-device-class` | Target device type (hdd, ssd, nvme) |

## Choosing the Right Plugin

Ceph supports several erasure code plugins:

```bash
# Standard, widely used
ceph osd erasure-code-profile set profile1 plugin=jerasure k=4 m=2 technique=reed_sol_van

# Intel ISA-L hardware-accelerated (requires ISA-L library)
ceph osd erasure-code-profile set profile2 plugin=isa k=4 m=2 technique=reed_sol_van

# Locally Repairable Codes - faster single OSD recovery
ceph osd erasure-code-profile set profile3 plugin=lrc k=4 m=2 l=3

# SHEC - smaller repair bandwidth
ceph osd erasure-code-profile set profile4 plugin=shec k=4 m=3 c=2
```

The `jerasure` plugin is the default and works well for most use cases. Use `isa` when CPU hardware acceleration is available. Use `lrc` when you want to minimize recovery I/O for single-OSD failures.

## Validating a Profile

Before creating a pool, validate the profile to check for configuration errors:

```bash
ceph osd erasure-code-profile set test-profile k=6 m=3 crush-failure-domain=host
ceph osd erasure-code-profile get test-profile
```

Also simulate how the pool will distribute PGs:

```bash
crushtool -i /tmp/crushmap.bin --test --rule 0 --num-rep 9 \
  --min-x 0 --max-x 100 --show-statistics
```

## Deleting a Profile

You can only delete a profile that is not referenced by any pool:

```bash
ceph osd erasure-code-profile rm old-profile
```

If the profile is in use, you will get an error. List pools to find which one references it:

```bash
ceph osd pool ls detail | grep erasure_code_profile
```

## Using a Profile in Rook

In Rook, erasure code profiles are embedded inside the `CephBlockPool` spec. There is no separate profile object to create - Rook generates the profile automatically:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ec-pool
  namespace: rook-ceph
spec:
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
  deviceClass: hdd
```

To check the resulting profile in Ceph after the pool is created:

```bash
ceph osd pool get ec-pool erasure_code_profile
ceph osd erasure-code-profile get <profile-name>
```

## Summary

Erasure code profiles in Ceph define the protection parameters, plugin, technique, and CRUSH placement for erasure coded pools. Create profiles with `ceph osd erasure-code-profile set` before creating pools, and choose the `k` and `m` values that balance fault tolerance against storage overhead. Profiles cannot be changed after pool creation, so plan them carefully before deploying production pools.

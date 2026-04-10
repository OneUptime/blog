# How to Create Erasure Coded Pools in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Storage, Kubernetes, Erasure Coding

Description: Learn how to create erasure coded pools in Ceph with custom profiles, configure CRUSH rules, and enable them for RBD or RGW workloads.

---

## What Is Erasure Coding in Ceph

Erasure coding is a data protection method that splits data into data chunks and parity chunks, storing them across different OSDs. Unlike 3-way replication, which stores three full copies of data, erasure coding stores `k` data chunks and `m` parity chunks, allowing recovery from any `m` OSD failures while using less total disk space.

A common configuration is `k=4 m=2`, which stores 4 data chunks and 2 parity chunks across 6 OSDs. This provides the same fault tolerance as 3x replication but uses only 1.5x the storage instead of 3x.

## Creating an Erasure Code Profile

Before creating a pool, define a profile that specifies the coding parameters:

```bash
ceph osd erasure-code-profile set my-ec-profile \
  k=4 \
  m=2 \
  plugin=jerasure \
  technique=reed_sol_van \
  crush-failure-domain=host
```

Verify the profile:

```bash
ceph osd erasure-code-profile get my-ec-profile
```

List all profiles:

```bash
ceph osd erasure-code-profile ls
```

## Creating the Erasure Coded Pool

With the profile defined, create the pool:

```bash
ceph osd pool create my-ec-pool erasure my-ec-profile
```

Ceph automatically calculates the number of placement groups. To specify manually:

```bash
ceph osd pool create my-ec-pool 128 128 erasure my-ec-profile
```

Enable the pool for use with an application. For RADOS Gateway (RGW):

```bash
ceph osd pool application enable my-ec-pool rgw
```

For general block storage:

```bash
ceph osd pool application enable my-ec-pool rbd
```

## Creating a CRUSH Rule for the EC Pool

By default, Ceph creates a CRUSH rule from the erasure code profile when the pool is created. To target a specific device class or topology, include CRUSH parameters in the profile:

```bash
ceph osd erasure-code-profile set my-ec-profile \
  k=4 m=2 \
  plugin=jerasure \
  technique=reed_sol_van \
  crush-failure-domain=host \
  crush-root=default \
  crush-device-class=ssd
```

Then create a dedicated CRUSH rule from the profile:

```bash
ceph osd crush rule create-erasure my-ec-rule my-ec-profile
```

## Creating an EC Pool in Rook

In a Rook-managed cluster, define a `CephBlockPool` with erasure coding:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: my-ec-pool
  namespace: rook-ceph
spec:
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
  deviceClass: ssd
```

Apply the manifest:

```bash
kubectl apply -f ec-pool.yaml
kubectl -n rook-ceph get cephblockpool my-ec-pool
```

## Verifying the EC Pool

Check pool details after creation:

```bash
ceph osd pool ls detail
ceph osd pool get my-ec-pool all
```

Look for `erasure_code_profile` and confirm the correct profile is attached. Check the PG distribution:

```bash
ceph pg ls-by-pool my-ec-pool | head -20
```

## Enabling RBD on an EC Pool

RBD images require a small metadata pool (replicated) alongside the EC data pool. Create a replicated pool for metadata:

```bash
ceph osd pool create rbd-meta replicated
rbd pool init rbd-meta
```

Then create an RBD image using the EC pool for data:

```bash
rbd create --pool rbd-meta --data-pool my-ec-pool --size 10G myimage
```

## Summary

Creating erasure coded pools in Ceph requires defining an erasure code profile with `k` and `m` values, then creating the pool referencing that profile. EC pools provide significant storage efficiency gains over replication, especially for large object workloads like RGW. In Rook-managed clusters, the `CephBlockPool` manifest handles this configuration declaratively.

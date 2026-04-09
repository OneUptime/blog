# How to Set Up Erasure Coded Pools in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Erasure Coding, Storage Pool, Kubernetes, Efficiency

Description: Learn how to create and configure erasure coded pools in Ceph to reduce storage overhead while maintaining data durability across your cluster.

---

Erasure coding is a data protection method that encodes data into fragments and distributes them across OSDs, allowing reconstruction even when some fragments are lost. Compared to replication, erasure coding can cut raw storage overhead significantly - for example, a 4+2 profile uses 1.5x overhead instead of 3x for triple replication.

## Understanding Erasure Coding Profiles

Before creating a pool, you must define an erasure coding profile. The profile specifies how many data chunks (k) and coding chunks (m) to use. The total number of OSDs required is k + m, and the cluster can tolerate losing up to m OSDs without data loss.

```bash
# List existing erasure coding profiles
ceph osd erasure-code-profile ls

# View details of the default profile
ceph osd erasure-code-profile get default
```

## Creating an Erasure Coding Profile

```bash
# Create a 4+2 profile (4 data chunks, 2 coding chunks)
ceph osd erasure-code-profile set my-ec-profile \
  k=4 \
  m=2 \
  plugin=jerasure \
  technique=reed_sol_van

# Create a 2+1 profile suitable for smaller clusters
ceph osd erasure-code-profile set small-ec-profile \
  k=2 \
  m=1 \
  plugin=jerasure \
  technique=reed_sol_van
```

The storage overhead factor is calculated as `(k + m) / k`. For a 4+2 profile: `6 / 4 = 1.5x` overhead.

## Creating the Erasure Coded Pool

Once a profile exists, create the pool referencing it:

```bash
# Create an erasure coded pool using the profile
ceph osd pool create my-ec-pool erasure my-ec-profile

# Verify the pool was created
ceph osd pool ls detail | grep my-ec-pool
```

## Setting the Application Tag

Always set the application tag on your pool so Ceph knows what type of data it holds:

```bash
# Tag the pool for RGW (object storage)
ceph osd pool application enable my-ec-pool rgw

# Tag for RBD (block storage) - note: EC pools have limitations with RBD
ceph osd pool application enable my-ec-pool rbd
```

## Configuring Pool Parameters

After creation, tune additional parameters for your workload:

```bash
# Set the minimum number of shards required for I/O
ceph osd pool set my-ec-pool min_size 3

# Allow fast reads (attempts to read from all shards simultaneously)
ceph osd pool set my-ec-pool fast_read 1

# View all pool parameters
ceph osd pool get my-ec-pool all
```

## Using Erasure Coded Pools with Rook

In a Rook-managed Ceph cluster, define erasure coded pools through the CephBlockPool CRD:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ec-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  erasureCoded:
    dataChunks: 4
    codingChunks: 2
  parameters:
    compression_mode: aggressive
```

Apply the manifest:

```bash
kubectl apply -f ec-pool.yaml

# Verify the pool status
kubectl -n rook-ceph get cephblockpool ec-pool -o yaml
```

## Verifying the Pool

After creation, confirm the pool is healthy and using the correct profile:

```bash
# Check pool stats
ceph osd pool stats my-ec-pool

# View the CRUSH rule associated with the pool
ceph osd pool get my-ec-pool crush_rule

# Monitor placement group health
ceph pg ls-by-pool my-ec-pool | head -20
```

## Common Pitfalls

Erasure coded pools do not support all Ceph features. Key limitations include:

- No OMAP support - operations like RGW bucket indexing require a replicated pool for metadata
- Partial writes require a full stripe read-modify-write cycle, increasing latency
- RBD images on EC pools have limited feature support and require a separate replicated pool for metadata

```bash
# Check if EC overwrites are enabled (required for RBD and CephFS data pools)
ceph osd pool get my-ec-pool allow_ec_overwrites

# Enable EC overwrites if needed for CephFS data pools
ceph osd pool set my-ec-pool allow_ec_overwrites true
```

## Summary

Erasure coded pools in Ceph provide efficient storage by reducing overhead from 3x replication to as low as 1.5x with a 4+2 profile, while still tolerating multiple OSD failures. Setting up an EC pool requires creating a profile with k and m values, creating the pool referencing that profile, and enabling the appropriate application tag. Be aware of EC pool limitations around OMAP and partial writes when planning your architecture.

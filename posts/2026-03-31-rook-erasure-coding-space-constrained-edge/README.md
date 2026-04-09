# How to Configure Ceph Erasure Coding for Space-Constrained Edge

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Erasure Coding, Edge Computing, Storage Efficiency

Description: Learn how to configure Ceph erasure coding profiles optimized for space-constrained edge deployments to maximize usable storage from limited hardware.

---

Edge deployments frequently have tight storage budgets. 3-way replication uses 3x the raw disk space, leaving only 33% usable. Erasure coding can reduce this overhead significantly while maintaining data protection.

## Erasure Coding vs Replication Trade-offs

| Profile | Raw Overhead | Min OSDs | Fault Tolerance |
|---------|-------------|----------|-----------------|
| 3-way replication | 3x (33% efficient) | 3 | 2 OSD failures |
| EC 2+1 | 1.5x (67% efficient) | 3 | 1 OSD failure |
| EC 4+2 | 1.5x (67% efficient) | 6 | 2 OSD failures |
| EC 2+2 | 2x (50% efficient) | 4 | 2 OSD failures |

For edge with 3 nodes and limited storage, EC 2+1 is the optimal choice.

## Creating an Erasure Code Profile

```bash
ceph osd erasure-code-profile set edge-ec-profile \
  k=2 m=1 \
  plugin=jerasure \
  technique=reed_sol_van \
  crush-failure-domain=host

ceph osd erasure-code-profile get edge-ec-profile
```

## Creating the Erasure-Coded Pool

```bash
ceph osd pool create ec-edge-data 32 32 erasure edge-ec-profile
```

In Rook:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ec-edge-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  erasureCoded:
    dataChunks: 2
    codingChunks: 1
```

## Using EC Pool with RGW Object Storage

Erasure-coded pools work natively with RGW:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: edge-store
  namespace: rook-ceph
spec:
  dataPool:
    erasureCoded:
      dataChunks: 2
      codingChunks: 1
  metadataPool:
    replicated:
      size: 2
  gateway:
    port: 80
    instances: 1
```

## EC Pool Limitations

Erasure-coded pools have some constraints:
- RBD metadata (headers, omap data) must be stored in a separate replicated pool
- Some RADOS operations that require full object access are not supported

Since Ceph Luminous (12.2.x), EC pools support RBD directly via `allow_ec_overwrites` (requires BlueStore OSDs):

```bash
# Enable overwrites on the EC pool
ceph osd pool set ec-edge-data allow_ec_overwrites true

# Create a replicated pool for RBD metadata
ceph osd pool create ec-edge-meta 16 replicated

# Create an RBD image using the EC pool for data
rbd create --size 10G --data-pool ec-edge-data ec-edge-meta/my-image
```

## Monitoring Space Efficiency

```bash
ceph df detail | grep -A3 ec-edge-pool
ceph osd pool stats ec-edge-pool
```

Compare raw usage vs stored data:

```bash
ceph df | awk '/ec-edge-pool/{print "Stored:", $3, "Raw:", $4, "Overhead:", $4/$3"x"}'
```

## Summary

Erasure coding with a k=2, m=1 profile is the optimal configuration for space-constrained edge deployments using 3 nodes. It reduces raw storage overhead from 3x to 1.5x while tolerating one OSD failure. Combining EC data pools with RGW for object storage and using `allow_ec_overwrites` with a replicated metadata pool for RBD allows edge sites to maximize every GB of available disk capacity.

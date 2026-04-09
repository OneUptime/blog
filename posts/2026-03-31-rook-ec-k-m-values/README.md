# How to Choose K and M Values for Erasure Coding Profiles in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, ErasureCoding, Capacity, Storage

Description: Learn how to select optimal k (data chunks) and m (coding chunks) values for Ceph erasure code profiles based on fault tolerance, storage efficiency, and cluster size.

---

Choosing the right `k` and `m` values for a Ceph erasure code profile is one of the most important decisions in cluster design. These two parameters control how much storage you save, how many simultaneous failures your cluster can survive, and how many OSD nodes you need.

## What k and m Mean

- `k` = number of data chunks (determines usable portion of each stripe)
- `m` = number of coding/parity chunks (determines fault tolerance)
- Total shards per object = `k + m`
- Storage overhead = `(k + m) / k`
- Simultaneous failures tolerated = `m`

## Minimum OSD Requirement

Ceph requires at least `k + m` OSDs across distinct failure domains (hosts, racks, etc.). With `crush_failure_domain=host`:

```text
Profile    Min Hosts Required
k=2, m=1   3 hosts
k=4, m=2   6 hosts
k=6, m=3   9 hosts
k=8, m=3   11 hosts
k=10, m=4  14 hosts
```

## Storage Efficiency vs Fault Tolerance

```text
Profile     Overhead   Efficiency   Failures Tolerated
k=2, m=1    1.5x       66.7%        1
k=4, m=2    1.5x       66.7%        2
k=6, m=2    1.33x      75.0%        2
k=8, m=2    1.25x      80.0%        2
k=8, m=3    1.375x     72.7%        3
k=12, m=4   1.33x      75.0%        4
```

Note: Increasing k while keeping m fixed improves efficiency but increases the number of OSDs required and increases recovery I/O fan-out.

## Choosing m Based on Risk Tolerance

- `m=1`: Minimum viable. Only one failure tolerated. Suitable for non-critical data with fast replacement SLAs.
- `m=2`: Standard production. Equivalent to 3-way replication's fault tolerance. Recommended default.
- `m=3`: High durability. Tolerates any 3 simultaneous OSD failures. Suitable for archival.
- `m=4`: Very high durability. Rarely used except for petabyte-scale archival tiers.

## Choosing k Based on Cluster Size

Larger k values improve storage efficiency but require more OSDs and increase read fan-out (more network connections per read). A good rule of thumb:

```text
Cluster Size    Recommended k
6-9 nodes       k=4
10-15 nodes     k=6 or k=8
16+ nodes       k=8 or k=10
PB-scale        k=12 or k=14
```

## Recovery Impact of k

During recovery from a failed OSD, Ceph must read from k surviving shards. Larger k values:
- Read from more OSDs (higher IOPS fan-out during recovery)
- Use more network bandwidth
- Take longer to repair the failed shard

For a k=8 profile, recovery reads from 8 OSDs simultaneously for each object recovered.

## Practical Example: 12-Node Cluster

For a 12-node cluster with 12 x 10 TiB drives per node (1440 TiB raw):

```text
Profile     Usable Capacity   Fault Tolerance
k=4, m=2    960 TiB           2 nodes
k=6, m=2    1080 TiB          2 nodes
k=8, m=3    1047 TiB          3 nodes
3-way rep    480 TiB           2 nodes
```

The k=6, m=2 profile offers the most usable capacity, while k=8, m=3 provides 3-node fault tolerance at slightly lower capacity.

## Creating the Profile in Rook

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ec-pool-k6m3
  namespace: rook-ceph
spec:
  erasureCoded:
    dataChunks: 6   # k=6
    codingChunks: 3 # m=3
```

## Summary

Choose `m` based on your fault tolerance requirements (m=2 is the standard production choice). Choose `k` based on your cluster size and efficiency goals - larger k values improve efficiency but require more nodes and increase recovery fan-out. Always verify you have at least `k + m` OSD hosts before creating the pool. The k=4, m=2 profile is the most widely used starting point, offering the same 2-failure tolerance as 3-way replication at half the storage cost.

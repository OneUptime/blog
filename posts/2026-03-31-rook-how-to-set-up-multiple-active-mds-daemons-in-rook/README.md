# How to Set Up Multiple Active MDS Daemons in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, MDS, Kubernetes, Scalability

Description: Configure multiple active MDS daemons in Rook to scale CephFS metadata throughput and reduce latency for large-scale filesystem workloads.

---

## Overview

CephFS uses Metadata Server (MDS) daemons to manage filesystem metadata. By default, only one MDS daemon is active at a time. For high-throughput workloads with many files and directories, you can enable multiple active MDS daemons, each responsible for a subset of the filesystem metadata tree. This is called a multi-MDS or active-active configuration.

## When to Use Multiple Active MDS

Consider multiple active MDS when:

- You have many small files or deep directory hierarchies
- Metadata operations are a bottleneck (check with `ceph fs status`)
- You need more than what a single MDS can provide (typically 10,000+ metadata ops/sec)
- Multiple teams access different subtrees of the filesystem

## Configure Multiple Active MDS in CephFilesystem

Set `activeCount` to the desired number of active MDS daemons:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: myfs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPools:
    - name: replicated
      replicated:
        size: 3
  metadataServer:
    activeCount: 3
    activeStandby: true
    resources:
      requests:
        cpu: "500m"
        memory: "1Gi"
      limits:
        memory: "4Gi"
```

Apply the change:

```bash
kubectl apply -f cephfilesystem-multi-mds.yaml
```

## Verify MDS Daemons

Check that the MDS pods are running:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mds
```

With `activeCount: 3` and `activeStandby: true`, you will see 6 pods (3 active + 3 standby):

```text
NAME                                    READY   STATUS    RESTARTS   AGE
rook-ceph-mds-myfs-a-6d9db9d4f5-abc1   1/1     Running   0          2m
rook-ceph-mds-myfs-b-5f8dc8c3e4-abc2   1/1     Running   0          2m
rook-ceph-mds-myfs-c-4e7cb7b2d3-abc3   1/1     Running   0          2m
rook-ceph-mds-myfs-d-3d6ba6a1c2-abc4   1/1     Running   0          2m
rook-ceph-mds-myfs-e-2c5a9f0b1-abc5    1/1     Running   0          2m
rook-ceph-mds-myfs-f-1b4b8e9a0-abc6    1/1     Running   0          2m
```

## Check MDS Status with Ceph

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs status myfs
```

Output shows ranks and their active/standby state:

```text
myfs - 3 clients
========
RANK  STATE           MDS     ACTIVITY     DNS    INOS   DIRS   CAPS
 0    active      myfs-a  Reqs:   10 /s  12.4k  12.5k  8.76k   9.1k
 1    active      myfs-b  Reqs:    8 /s  10.2k  10.3k  7.23k   7.8k
 2    active      myfs-c  Reqs:    5 /s   8.1k   8.2k  5.90k   6.2k
```

## Subtree Partitioning

With multiple active MDS, the filesystem is partitioned across ranks dynamically. You can also pin specific directories to specific MDS ranks:

```bash
# Pin /data/team-a subtree to rank 0 (run from a pod with CephFS mounted)
setfattr -n ceph.dir.pin -v 0 /mnt/cephfs/data/team-a
```

## MDS Memory Tuning

Each active MDS caches metadata in memory. Tune the cache size for your workload:

```yaml
metadataServer:
  activeCount: 3
  resources:
    requests:
      memory: "2Gi"
    limits:
      memory: "8Gi"
```

The MDS daemon uses approximately 1 KB of memory per cached inode.

## Summary

Multiple active MDS daemons in Rook scale CephFS metadata performance by distributing the metadata tree across several daemons. Set `activeCount` to the desired number and `activeStandby: true` for high availability. Monitor metadata throughput with `ceph fs status` to determine if additional ranks are needed, and use directory pinning to control how subtrees are distributed across ranks.

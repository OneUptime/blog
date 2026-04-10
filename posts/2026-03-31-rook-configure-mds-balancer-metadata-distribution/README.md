# How to Configure MDS Balancer for Even Metadata Distribution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, MDS, CephFS, Load Balancing, Kubernetes, Performance

Description: Learn how to configure the CephFS MDS balancer to evenly distribute metadata load across multiple active MDS daemons using heat-based load metrics.

---

## The MDS Balancer

When running multiple active MDS daemons, CephFS uses a balancer to redistribute directory subtrees between daemons based on load. Without proper balancer configuration, one MDS might handle the majority of requests while others are underutilized.

The balancer measures load using "heat" - a combination of request rates weighted by operation cost. High-heat subtrees are migrated to less-loaded MDS daemons.

## Enabling and Configuring the Balancer

The balancer is enabled by default in CephFS. Check its current mode:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get mds mds_bal_mode
```

Available modes (these control how load is calculated, not whether balancing occurs):
- `0` - Hybrid (default) - combines auth metadata load, request rate, and queue length
- `1` - Request rate and latency based
- `2` - CPU load based

Set the balancer mode:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_bal_mode 0
```

## Tuning Balancer Intervals

Configure how frequently the balancer runs:

```bash
# Evaluation interval in seconds (how often to check for imbalance)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_bal_interval 10

# Directory fragment split delay in seconds (delay before splitting large directories)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_bal_fragment_interval 5
```

## Setting Load Thresholds

Control when the balancer triggers migrations:

```bash
# Minimum proportional load above average before exporting subtrees (default 0.1)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_bal_min_rebalance 0.1

# Minimum load on an MDS before the balancer considers it for rebalancing (default 0.8)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_bal_need_min 0.8
```

## Monitoring Balancer Activity

Check the current load distribution across MDS daemons:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph fs status myfs

# Check which subtrees each MDS owns
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph daemon mds.myfs.a get subtrees
```

View balancer-related counters:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph daemon mds.myfs.a perf dump | \
  python3 -c "import json,sys; d=json.load(sys.stdin); \
  mds=d.get('mds',{}); [print(k,v) for k,v in mds.items() if 'bal' in k or 'export' in k or 'import' in k or 'subtree' in k]"
```

## Overriding the Balancer with Manual Pins

For directories where you want deterministic placement regardless of load, use directory pinning:

```bash
# Pin this directory and its subtree to MDS rank 0
setfattr -n ceph.dir.pin -v 0 /mnt/cephfs/hot-directory

# Verify the pin
getfattr -n ceph.dir.pin /mnt/cephfs/hot-directory
```

Pinned subtrees are never migrated by the balancer, ensuring consistent MDS locality for latency-sensitive paths.

## Summary

The CephFS MDS balancer automatically distributes directory subtree ownership across multiple active MDS daemons using load heat metrics. Key tuning parameters include the balancer mode, evaluation interval, and load imbalance threshold. For workloads with predictable access patterns, combine automatic balancing with manual directory pinning to achieve both efficient overall load distribution and consistent per-directory MDS locality.

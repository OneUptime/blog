# How to Configure target_size_ratio for PG Autoscaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, PG Autoscaler, Pool, Performance

Description: Learn how to configure target_size_ratio for Ceph pools to guide the PG autoscaler in allocating the right number of placement groups based on expected data proportions.

---

## What target_size_ratio Does

The Ceph PG autoscaler uses `target_size_ratio` to understand what proportion of total cluster capacity a pool should occupy. This helps the autoscaler pre-allocate the right number of PGs before a pool fills up, preventing performance degradation from too few PGs on busy pools.

Without `target_size_ratio`, the autoscaler bases PG counts purely on current usage, which can lead to sudden PG splits when pools grow quickly.

## Enable the PG Autoscaler

First ensure the PG autoscaler module is enabled:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph mgr module enable pg_autoscaler
  ceph osd pool autoscale-status
"
```

## Configure target_size_ratio via Rook CRD

Set `target_size_ratio` in the pool parameters. The value should be a fraction of the total cluster raw capacity:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: database-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
  parameters:
    pg_autoscale_mode: "on"
    target_size_ratio: "0.4"   # Expect this pool to use 40% of cluster capacity
```

For multiple pools sharing the cluster, ratios should sum to approximately 1.0:

```yaml
# Pool 1: database workloads - 40% of capacity
target_size_ratio: "0.4"

# Pool 2: object storage - 40% of capacity
target_size_ratio: "0.4"

# Pool 3: filesystem data - 20% of capacity
target_size_ratio: "0.2"
```

## Set via CLI for Existing Pools

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # Set target size ratio for the rbd pool
  ceph osd pool set rbd target_size_ratio 0.5

  # Check autoscaler recommendations after setting
  ceph osd pool autoscale-status
"
```

## View Autoscaler Status

The autoscale-status command shows what the autoscaler calculates based on your ratios:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph osd pool autoscale-status
"
```

Example output:

```text
POOL      SIZE  TARGET SIZE  RATE  RAW CAPACITY  RATIO  TARGET RATIO  EFFECTIVE RATIO  BIAS  PG_NUM  NEW PG_NUM  AUTOSCALE
rbd        50G       0       3.0   300G          0.17   0.40         0.40            1.0    64       128         on
```

If `NEW PG_NUM` differs from `PG_NUM`, the autoscaler will increase or decrease PGs automatically.

## target_size_bytes vs target_size_ratio

Two options are available:

```bash
# Option 1: Absolute size target (in bytes)
ceph osd pool set my-pool target_size_bytes 107374182400  # 100GiB

# Option 2: Ratio of total cluster capacity (0.0 to 1.0)
ceph osd pool set my-pool target_size_ratio 0.3
```

Use `target_size_ratio` when you want pools to scale proportionally as you add capacity. Use `target_size_bytes` when you have a fixed expected data volume.

## Monitor PG Counts After Setting

Watch the autoscaler adjusting PG counts:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # Watch PG count changes in real time
  watch -n 5 'ceph osd pool ls detail | grep pg_num'
"
```

PG splits happen gradually and cause temporary increased IO. Run during low-traffic periods.

## Summary

The `target_size_ratio` parameter guides the Ceph PG autoscaler to pre-allocate appropriate PG counts for each pool based on expected proportional capacity usage. Setting ratios for all pools that sum to 1.0 gives the autoscaler a complete picture of your workload distribution. This prevents the performance impact of PG splits during rapid data growth by ensuring sufficient PGs exist before pools become heavily utilized.

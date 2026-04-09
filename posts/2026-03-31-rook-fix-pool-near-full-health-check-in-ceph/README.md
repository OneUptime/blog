# How to Fix POOL_NEAR_FULL Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Pool, Health Check, Capacity

Description: Learn how to resolve POOL_NEAR_FULL in Ceph, a proactive warning that a pool is approaching its capacity limit before writes are blocked.

---

## What Is POOL_NEAR_FULL?

`POOL_NEAR_FULL` is a Ceph health warning issued when a pool has exceeded the `nearfull_ratio` threshold (default: 85% of total cluster capacity or the pool's quota). It is a proactive warning - writes are not yet blocked - but if the trend continues, the pool will hit `POOL_FULL` and all writes will be halted.

This warning provides a window of time to take action before your applications start experiencing write failures.

## Checking the Warning

```bash
ceph health detail
ceph df
```

Example output:

```text
[WRN] POOL_NEAR_FULL: 1 pool(s) nearfull
    pool 'rbd' is 87.5% full
```

Check per-pool and per-OSD usage:

```bash
ceph df detail
ceph osd df
```

Identify the nearfull ratio:

```bash
ceph config get mon mon_osd_nearfull_ratio
```

## Immediate Actions

### Action 1 - Identify What Is Using Space

Find the largest RBD images:

```bash
rbd ls <pool-name>
for img in $(rbd ls <pool-name>); do
  rbd info <pool-name>/$img | grep size
done | sort -k3 -n -r | head -10
```

Find stale or orphaned snapshots:

```bash
rbd ls --long <pool-name> | grep -i snap
```

### Action 2 - Clean Up Snapshots

Purge old snapshots:

```bash
rbd snap ls <pool-name>/<image>
rbd snap purge <pool-name>/<image>
```

For Kubernetes PVCs:

```bash
kubectl get volumesnapshot -A
kubectl delete volumesnapshot <snapshot-name> -n <namespace>
```

### Action 3 - Increase Storage Capacity

Add new OSD nodes/disks. In Rook, add new nodes and restart the operator:

```bash
kubectl -n rook-ceph rollout restart deploy/rook-ceph-operator
```

Monitor new OSD discovery:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd
```

### Action 4 - Rebalance Uneven OSDs

If some OSDs are much fuller than others:

```bash
ceph osd reweight-by-utilization
```

### Action 5 - Adjust Pool Quota

If the pool has a quota set too low, increase it:

```bash
ceph osd pool get-quota <pool-name>
ceph osd pool set-quota <pool-name> max_bytes 2199023255552
```

## Setting Up Proactive Alerting

Configure Prometheus to alert before reaching nearfull. The built-in `ceph_pool_percent_used` metric (available since Ceph Pacific) gives the pool utilization as a 0-to-1 fraction and is guaranteed to match `ceph df` output:

```yaml
- alert: CephPoolNearFull
  expr: ceph_pool_percent_used > 0.75
  for: 5m
  annotations:
    summary: "Ceph pool {{ $labels.pool_id }} usage above 75%"
```

If `ceph_pool_percent_used` is not available in your Ceph version, calculate utilization manually. The correct formula divides stored bytes by total capacity (stored + available):

```yaml
- alert: CephPoolNearFull
  expr: (ceph_pool_stored / (ceph_pool_stored + ceph_pool_max_avail)) > 0.75
  for: 5m
  annotations:
    summary: "Ceph pool {{ $labels.pool_id }} usage above 75%"
```

Note: Do not use `ceph_pool_stored / ceph_pool_max_avail` alone, because that ratio approaches infinity as the pool fills rather than producing a 0-to-1 percentage.

## Summary

`POOL_NEAR_FULL` is a proactive warning that a pool is approaching capacity. Act before it hits `POOL_FULL` by cleaning up snapshots and unused images, adding OSD capacity, rebalancing uneven OSDs, or adjusting pool quotas. Set up Prometheus alerts at 70-75% utilization to catch this trend earlier and provide more time to respond.

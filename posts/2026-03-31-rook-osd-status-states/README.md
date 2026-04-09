# How to Monitor OSD Status and Operational States in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Monitoring, Health

Description: Monitor Ceph OSD operational states including up/down, in/out, weight, and utilization using ceph osd stat and ceph osd df commands in Rook clusters.

---

OSDs (Object Storage Daemons) are the workhorses of Ceph. Each OSD manages a disk and handles read/write requests for its data. Monitoring OSD states is critical for detecting failures, disk usage imbalances, and recovery progress.

## OSD State Model

Each OSD has two independent state axes:

| State | Meaning |
|---|---|
| `up` | Daemon is running and reachable |
| `down` | Daemon is stopped or unreachable |
| `in` | Included in data placement (reweight > 0) |
| `out` | Excluded from data placement (reweight = 0) |

Normal state: `up + in`
Degraded: `down + in` (data has fewer copies, recovery starts after timeout)
Draining: `up + out` or `down + out` (being removed)

## Get OSD Summary Statistics

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph osd stat
```

Sample output:

```text
6 osds: 6 up (since 2d), 6 in (since 5d); epoch: e1234
```

## List All OSDs with Status

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph osd dump
```

Or a more compact view:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd dump --format json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for osd in data['osds']:
    state = 'up' if osd.get('up') else 'down'
    placement = 'in' if osd.get('in') else 'out'
    weight = osd.get('weight', 0)
    print(f'osd.{osd[\"osd\"]}: {state}+{placement}, weight={weight:.3f}')
"
```

## View OSD Disk Usage and Balance

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph osd df
```

Sample output:

```text
ID  CLASS  WEIGHT   REWEIGHT  SIZE    RAW USE  DATA     OMAP    META    AVAIL    %USE   VAR    PGS  STATUS
 0  hdd    1.00000  1.00000   2 TiB   280 GiB  265 GiB  512 MiB  15 GiB  1.7 TiB  13.67  1.00   45  exists,up
 1  hdd    1.00000  1.00000   2 TiB   290 GiB  275 GiB  480 MiB  15 GiB  1.7 TiB  14.16  1.04   47  exists,up
 2  hdd    1.00000  1.00000   2 TiB   270 GiB  255 GiB  520 MiB  15 GiB  1.7 TiB  13.18  0.96   43  exists,up
```

The `VAR` column shows variance from mean utilization (1.0 = average, >1 = above average).

## Sort by Usage to Find Imbalanced OSDs

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd df | sort -k17 -n -r
```

## Monitor Down OSDs

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd dump | grep "down"
```

Or watch live for OSD state changes:

```bash
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph -w | grep osd
```

## Check OSD Status in Kubernetes

Rook manages OSD pods. Check their status:

```bash
kubectl get pods -n rook-ceph -l app=rook-ceph-osd
```

For a specific OSD:

```bash
kubectl describe pod -n rook-ceph \
  $(kubectl get pod -n rook-ceph -l ceph_daemon_id=0 -o name)
```

## Set OSD Down and Out for Maintenance

```bash
# Mark an OSD out before removing/replacing its disk
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd out osd.3
```

Wait for recovery to complete, then verify:

```bash
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph health detail | grep degraded
```

## Summary

Ceph OSD states (`up/down` and `in/out`) determine whether a daemon is running and whether it participates in data placement. Use `ceph osd stat` for a quick count, `ceph osd df` for per-disk utilization and variance, and `ceph osd dump` for detailed state information. Monitor OSD pods via kubectl and watch for `down+in` states that trigger recovery workloads on the remaining OSDs.

# How to Configure OSD Recovery Settings in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Recovery, Performance

Description: Learn how to tune Ceph OSD recovery settings in Rook to balance data healing speed against cluster performance impact.

---

## Why OSD Recovery Settings Matter

When an OSD fails or a new one is added, Ceph begins recovering data by replicating or re-encoding PGs across surviving OSDs. This process can consume significant I/O and CPU resources, causing latency spikes for production workloads. Tuning recovery settings lets you control how aggressively Ceph heals data versus how much headroom you leave for client operations.

## Key Recovery Parameters

The most important knobs for OSD recovery are:

- `osd_recovery_max_active` - maximum number of active recovery requests per OSD
- `osd_recovery_max_active_hdd` / `osd_recovery_max_active_ssd` - per-device-class limits
- `osd_recovery_sleep` - sleep time between recovery operations
- `osd_max_backfills` - maximum concurrent backfill operations per OSD
- `osd_recovery_op_priority` - priority relative to client I/O

## Viewing Current Settings

Access current recovery configuration from the Rook toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config show osd.0 | grep -E "recovery|backfill"
```

## Reducing Recovery Impact on Production

To protect client latency during recovery, limit concurrency and add sleep:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_recovery_max_active_hdd 1

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_recovery_sleep_hdd 0.1

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_max_backfills 1
```

## Speeding Up Recovery After Maintenance

After planned maintenance when no clients are active, accelerate recovery:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_recovery_max_active_hdd 5

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_recovery_sleep_hdd 0

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_max_backfills 5
```

## Persisting Settings in Rook CephCluster

For permanent configuration, add settings to the `CephCluster` resource:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephConfig:
    "osd.*":
      osd_recovery_max_active_hdd: "2"
      osd_recovery_sleep_hdd: "0.05"
      osd_max_backfills: "2"
```

Apply with:

```bash
kubectl apply -f cephcluster.yaml
```

## Monitoring Recovery Progress

Watch recovery progress in real time:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  watch -n 5 ceph status
```

The `recovery io` line shows current throughput. The `degraded` object count decreases as recovery completes.

## Restoring Default Settings

After recovery completes, restore defaults to allow maximum performance:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config rm osd osd_recovery_max_active_hdd

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config rm osd osd_recovery_sleep_hdd
```

## Summary

OSD recovery settings in Ceph directly affect the trade-off between healing speed and client performance. Using `ceph config set` from the Rook toolbox, you can throttle recovery for production stability or accelerate it during maintenance windows. Persisting these settings in the `CephCluster` CRD ensures they survive operator restarts and upgrades.

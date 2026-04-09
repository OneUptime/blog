# How to Set Storage Ratios (fullRatio, backfillFullRatio, nearFullRatio) in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Storage Ratios, Capacity Planning, CephCluster

Description: Learn how to configure fullRatio, backfillFullRatio, and nearFullRatio in Rook CephCluster to control when Ceph stops writes and triggers capacity alerts.

---

## What Are Storage Ratios in Ceph

Ceph uses three capacity thresholds to manage storage safety:

- **nearFullRatio**: Warning threshold. Ceph emits a `HEALTH_WARN` when OSDs exceed this. No writes are blocked. Default: 0.85 (85%)
- **backfillFullRatio**: Backfill is disabled above this threshold to prevent OSDs from running completely full during recovery. Default: 0.90 (90%)
- **fullRatio**: Critical threshold. Ceph blocks ALL writes to pools when any OSD exceeds this. Default: 0.95 (95%)

```text
0%                 85%           90%          95%       100%
|--normal writes---|--WARN--------|--no fill----|--FULL----|
                   nearFull   backfillFull    full
```

## Configuring Ratios in the CephCluster CRD

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  # ... other settings ...
  storage:
    fullRatio: 0.95
    backfillFullRatio: 0.90
    nearFullRatio: 0.85
```

## Understanding the Impact of Each Threshold

### nearFullRatio (Warning)

When any OSD exceeds nearFullRatio, `ceph health` shows:

```text
HEALTH_WARN
    1 nearfull osd(s)
    osd.2 is near full
```

No writes are blocked, but this is a signal to add capacity or delete data before the full threshold is reached.

### backfillFullRatio (Recovery Protection)

When an OSD exceeds backfillFullRatio:
- Backfill and recovery operations targeting that OSD are paused
- Active writes to the pool may still continue
- This prevents recovery operations from pushing an OSD over the fullRatio

```bash
# Check backfill status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg dump | grep backfill
```

### fullRatio (Write Block)

When any OSD exceeds fullRatio:

```text
HEALTH_ERR
    1 full osd(s)
    osd.2 is full
    1 pool(s) are full
```

All writes to affected pools are blocked. Applications receive `ENOSPC` (No space left on device) errors. This is an emergency condition.

## Viewing Current Ratios

```bash
# Check configured and current usage
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd dump | grep -E "full|near"
```

```text
full_ratio 0.95
backfillfull_ratio 0.9
nearfull_ratio 0.85
```

```bash
# Check current OSD utilization vs thresholds
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd df
```

```text
ID  CLASS   SIZE    USE     AVAIL    %USE  VAR  PGS  STATUS
 0  hdd    500GiB  425GiB   75GiB  85.0   1.0   64     up
 1  hdd    500GiB  100GiB  400GiB  20.0   0.2   64     up
```

## Adjusting Ratios for Your Environment

For environments with careful capacity monitoring and automatic alerts, you can set more conservative (lower) thresholds:

```yaml
spec:
  storage:
    nearFullRatio: 0.75   # Alert at 75% - more buffer time to respond
    backfillFullRatio: 0.85
    fullRatio: 0.90       # Block writes at 90% instead of 95%
```

For environments with predictable data growth and automated expansion:

```yaml
spec:
  storage:
    nearFullRatio: 0.85
    backfillFullRatio: 0.90
    fullRatio: 0.95       # Standard defaults
```

## Emergency: Recovering from a Full Cluster

If the cluster reaches fullRatio and writes are blocked:

```bash
# Option 1: Temporarily raise the full ratio (buys time, not a fix)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd set-full-ratio 0.97

# Option 2: Delete data from affected pools
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados -p replicapool rm <object-name>

# Option 3: Add new OSDs (requires new disks or PVCs)
# Edit CephCluster to add more nodes/devices

# Option 4: Expand existing PVC-backed OSDs
kubectl -n rook-ceph edit pvc <osd-pvc-name>
# Increase storage request (if StorageClass supports expansion)
```

## Monitoring Capacity with Prometheus Alerts

```yaml
# PrometheusRule for Ceph capacity
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ceph-capacity-alerts
  namespace: rook-ceph
spec:
  groups:
    - name: ceph-capacity
      rules:
        - alert: CephNearFull
          expr: (ceph_osd_stat_bytes_used / ceph_osd_stat_bytes) * 100 > 80
          for: 5m
          annotations:
            summary: "Ceph OSD near full"
            description: "OSD {{ $labels.ceph_daemon }} is at {{ $value }}% capacity"
        - alert: CephFull
          expr: ceph_health_status == 2
          for: 1m
          annotations:
            summary: "Ceph cluster is in ERROR state - may be full"
```

## Summary

Rook-Ceph uses three storage ratio thresholds to manage cluster safety: `nearFullRatio` (default 0.85) triggers health warnings, `backfillFullRatio` (default 0.90) pauses recovery operations, and `fullRatio` (default 0.95) blocks all writes. Configure these in the `CephCluster` spec under `storage`. Set `nearFullRatio` conservatively to give yourself time to add capacity before write operations are affected. Always set up monitoring alerts at nearFullRatio to avoid emergency situations at fullRatio.

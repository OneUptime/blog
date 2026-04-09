# How to Handle Cascading OSD Failures During Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Failure, Recovery, Storage

Description: Learn how to handle cascading OSD failures during Ceph recovery, prevent data loss, and stabilize the cluster when multiple OSDs fail in sequence.

---

## What Are Cascading OSD Failures?

Cascading OSD failures occur when one OSD failure triggers additional failures - often due to related hardware (same disk shelf, HBA, or power circuit), or because recovery stress causes already-degraded drives to fail. This is one of the most dangerous scenarios in a Ceph cluster.

## Detecting the Situation

Check cluster health immediately:

```bash
ceph -s
ceph health detail
```

Look for multiple OSDs in the `down` state:

```bash
ceph osd tree | grep down
```

Identify how many OSDs are down vs. the pool's `min_size`:

```bash
ceph osd pool get <pool-name> min_size
ceph osd pool get <pool-name> size
ceph -s | grep degraded
```

If degraded percentages are high (>50%), pause and assess before taking further action.

## Immediate Stabilization Steps

### Step 1: Pause recovery to prevent further stress

```bash
ceph osd set norecover
ceph osd set nobackfill
ceph osd set norebalance
```

### Step 2: Mark failed OSDs as out carefully

Wait before marking OSDs `out` - Ceph waits `mon_osd_down_out_interval` (default 600 seconds):

```bash
ceph config get mon mon_osd_down_out_interval
```

Manually mark an OSD out only when you are ready for rebalancing:

```bash
ceph osd out osd.<id>
```

### Step 3: Check for PGs below min_size

```bash
ceph pg dump | grep -E "incomplete|down"
```

If PGs are marked `incomplete` or `down`, clients cannot read/write to those PGs until recovery completes.

## Recovering from Cascading Failures

### Replace failed OSDs

In Rook, OSDs on failed nodes are automatically recreated when the node comes back or when the CephCluster is reconciled. Check OSD pod status:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd
```

For permanent OSD failures, remove and reprovision:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  removeOSDsIfOutAndSafeToRemove: true
```

### Re-enable recovery in a controlled order

```bash
ceph osd unset norebalance
ceph osd unset nobackfill
ceph osd unset norecover
```

## Throttle Recovery to Prevent Further Failures

Reduce recovery aggressiveness to protect surviving drives:

```bash
ceph config set osd osd_recovery_max_active 1
ceph config set osd osd_recovery_sleep_hdd 1.0
ceph config set osd osd_max_backfills 1
```

## Monitoring Recovery After Cascading Failures

```bash
watch -n 5 ceph -s
ceph pg dump_stuck unclean
ceph osd tree | grep -v up
```

## Summary

Cascading OSD failures require immediate triage: pause recovery to reduce disk stress, identify affected PGs, and replace failed hardware before resuming. Throttling recovery aggressiveness protects surviving OSDs from failure under load. Rook simplifies OSD replacement by automatically reconciling cluster state when nodes return to service.

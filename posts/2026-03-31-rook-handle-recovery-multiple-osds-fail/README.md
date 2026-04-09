# How to Handle Recovery When Multiple OSDs Fail Simultaneously

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Recovery, Failure, Storage

Description: Learn how to safely handle simultaneous multiple OSD failures in Ceph, assess data risk, and orchestrate recovery to restore cluster integrity in Rook environments.

---

## Assessing the Damage

When multiple OSDs fail simultaneously (such as after a power outage or network segment failure), the first step is assessment. Do not rush into recovery actions.

Check cluster state:

```bash
ceph -s
ceph osd tree | grep down
ceph health detail
```

Determine how many OSDs are down relative to your replication factor:

```bash
ceph osd pool ls detail | grep size
```

Critical threshold: if `down_osds > (size - min_size)` for any pool, PGs in that pool may be unavailable.

## Checking PG Availability

Identify PGs that are incomplete or down:

```bash
ceph pg dump | grep -E "down|incomplete"
ceph pg dump_stuck unclean
```

If PGs are in `incomplete` state, data in those PGs is inaccessible until enough OSDs return.

## Preventing Premature Rebalancing

Immediately set flags to prevent Ceph from rebalancing with incomplete information:

```bash
ceph osd set norecover
ceph osd set nobackfill
ceph osd set norebalance
ceph osd set noout
```

This prevents Ceph from marking OSDs `out` and triggering unnecessary data movement while you diagnose.

## Recovery Strategy by Failure Type

### Temporary failures (network interruption, brief power loss)

Wait for OSDs to come back online naturally. Unset all flags to let Ceph resume recovery automatically:

```bash
ceph osd unset noout
ceph osd unset norebalance
ceph osd unset nobackfill
ceph osd unset norecover
```

### Permanent OSD failures

Remove failed OSDs after confirming data has been replicated elsewhere:

```bash
ceph osd safe-to-destroy osd.<id>
ceph osd destroy osd.<id> --yes-i-really-mean-it
```

In Rook, failed OSD pods will show as CrashLoopBackOff or Pending:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd
```

## Rook OSD Replacement Workflow

For permanent OSD failures, you can enable automatic OSD removal by setting `removeOSDsIfOutAndSafeToRemove` in the CephCluster spec. This tells Rook to automatically purge OSDs that are marked `out` and safe to destroy:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  removeOSDsIfOutAndSafeToRemove: true
```

For manual removal, delete the failed OSD deployment:

```bash
kubectl -n rook-ceph delete deployment rook-ceph-osd-<id>
```

Then add replacement storage and reconcile the cluster.

## Throttling Recovery for Multiple OSD Events

Multiple OSD failures create heavy recovery load. Use conservative throttling:

```bash
ceph config set osd osd_recovery_max_active 1
ceph config set osd osd_max_backfills 1
ceph config set osd osd_recovery_sleep_hdd 1.0
```

Gradually increase as recovery progresses and the cluster stabilizes:

```bash
ceph -s | grep degraded
```

## Summary

Simultaneous OSD failures require a careful, staged response: assess PG availability, pause rebalancing, and address hardware before resuming recovery. Conservative throttling protects surviving OSDs during the recovery. Rook simplifies OSD replacement through its operator reconciliation model, automatically reprovisioning storage when hardware is restored.

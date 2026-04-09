# How to Configure OSD Maintenance Timeout in Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, OSD, Maintenance, Reliability

Description: Set the OSD maintenance timeout in Rook-Ceph to control how long the operator waits for OSDs to come back online before it declares them failed and initiates data recovery.

---

## What is the OSD Maintenance Timeout

When you drain a Kubernetes node or an OSD pod stops running, the Ceph cluster marks the affected OSDs as `down`. Ceph waits a grace period before reclassifying them as `out` and starting data rebalancing to restore the desired replication factor.

Rook exposes the `osdMaintenanceTimeout` field to control this grace period at the operator level. Setting it appropriately prevents unnecessary rebalancing during short maintenance windows while ensuring recovery begins promptly after genuine hardware failures.

## Configuring osdMaintenanceTimeout

Set the timeout in the `CephCluster` spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  disruptionManagement:
    managePodBudgets: true
    osdMaintenanceTimeout: 30
```

The value is in minutes. The default is 30 minutes, which means the Rook operator holds the `noout` flag on the affected failure domain for half an hour during a node drain before allowing Ceph to mark the OSD as out.

## Choosing the Right Timeout

Match the timeout to your typical maintenance window:

```text
Scenario                              | Recommended timeout
--------------------------------------|---------------------
Rolling node reboots (fast, <10 min)  | 15-20 minutes
OS upgrades (20-45 min per node)      | 45-60 minutes
Hardware replacement (1-2 hours)      | 90-120 minutes
Disaster recovery from backup         | 0 (immediate rebalancing)
```

Setting `osdMaintenanceTimeout: 0` tells Ceph to begin rebalancing immediately when an OSD goes down, which is appropriate when you want the cluster to self-heal as quickly as possible after a failure.

## How This Interacts with Ceph Internals

Rook's `osdMaintenanceTimeout` does not directly set a Ceph configuration parameter. Instead, when a node is drained, the Rook operator sets the `noout` flag on the affected CRUSH failure domain and holds it for the duration of the timeout. While `noout` is active, Ceph will not mark the affected OSDs as `out`, preventing rebalancing. Once the timeout elapses and Rook removes the `noout` flag, Ceph's native `mon_osd_down_out_interval` (default 600 seconds) governs when the OSD transitions from `down` to `out` and triggers PG remapping and backfill.

You can verify the current `mon_osd_down_out_interval` value set in the cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get mon mon_osd_down_out_interval
```

## Monitoring OSD State During Maintenance

Check which OSDs are currently down:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
```

Watch the cluster recovery progress if rebalancing has started:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

The `recovery io` line in `ceph status` shows bytes/second being recovered. When it reaches zero and PG states return to `active+clean`, recovery is complete.

## Pausing Recovery During Extended Maintenance

For maintenance windows longer than your `osdMaintenanceTimeout`, manually pause recovery to reduce I/O load:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd set noout
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd set norebalance
```

Unset these flags when maintenance is complete:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd unset noout
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd unset norebalance
```

## Summary

The OSD maintenance timeout in Rook controls the delay between an OSD going down and Ceph beginning data recovery. Tuning it to match your actual maintenance window prevents expensive rebalancing operations during planned work, while a short or zero timeout ensures fast automatic recovery after genuine hardware failures.

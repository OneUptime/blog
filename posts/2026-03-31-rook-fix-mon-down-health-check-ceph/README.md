# How to Fix MON_DOWN Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Monitor, Health Check, Quorum

Description: Learn how to diagnose and fix the MON_DOWN health warning in Ceph by identifying failed monitors and restoring quorum in your cluster.

---

## Understanding MON_DOWN

Ceph monitors (MONs) form a quorum that maintains cluster state. The `MON_DOWN` health check fires when one or more monitors are unresponsive or have left the quorum. Without quorum, the cluster can stall and become read-only or unavailable entirely.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN 1/3 mons down, quorum a,c
[WRN] MON_DOWN: 1/3 mons down, quorum a,c
    mon.b is down (out of quorum)
```

## Checking Monitor Status

Inspect the full monitor map and quorum status:

```bash
ceph mon stat
ceph quorum_status -f json-pretty
```

The output shows which monitors are in quorum and which are absent.

## Diagnosing the Cause in Rook

In Rook-Ceph, check if the monitor pod is running:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mon
```

If a pod is in `CrashLoopBackOff` or `Pending` state, inspect logs:

```bash
kubectl -n rook-ceph logs <mon-pod-name> --previous
```

Common causes include:
- Node failure or eviction
- PVC mount failure for monitor data
- OOM kill due to insufficient memory
- Network partition between nodes

## Fixing a Crashed Monitor Pod

If the pod is crash-looping, check the underlying PVC:

```bash
kubectl -n rook-ceph get pvc | grep mon
kubectl -n rook-ceph describe pvc rook-ceph-mon-b
```

If the PVC is stuck in a pending state due to a failed node, you may need to delete the monitor and let Rook recreate it:

```bash
kubectl -n rook-ceph delete pod <mon-pod-name>
```

Rook will attempt to reschedule the monitor. If the monitor data is corrupted, remove it and allow Rook to provision a fresh one:

```bash
# Edit the CephCluster to remove the bad mon from the monCount temporarily
kubectl -n rook-ceph edit cephcluster rook-ceph
# Then re-add it to trigger reprovisioning
```

## Recovering a Bare Metal Monitor

On bare metal, restart the failed monitor daemon:

```bash
systemctl restart ceph-mon@<hostname>
journalctl -u ceph-mon@<hostname> -n 100
```

If the monitor cannot rejoin because its data is stale, first extract the current monmap from a healthy monitor, then reinitialize:

```bash
ceph mon getmap -o /tmp/monmap
ceph-mon --mkfs -i <mon-id> --monmap /tmp/monmap --keyring /etc/ceph/ceph.mon.keyring
systemctl restart ceph-mon@<mon-id>
```

## Verifying Quorum Restoration

After recovery, confirm quorum has been restored:

```bash
ceph quorum_status -f json-pretty | python3 -m json.tool | grep quorum_names
```

All three monitor names should appear in the quorum list.

## Setting Up Alerts

Prevent silent failures by configuring a Prometheus alert:

```yaml
- alert: CephMonDown
  expr: ceph_mon_quorum_status == 0
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Ceph monitor {{ $labels.ceph_daemon }} is out of quorum"
```

## Summary

`MON_DOWN` means one or more Ceph monitors have left the quorum. In Rook environments, inspect pod status and PVC health to identify the root cause. Restart or reprovision affected pods and verify quorum with `ceph quorum_status`. On bare metal, restart the daemon or reinitialize the monitor data. Always alert on monitor loss to respond before quorum is permanently lost.

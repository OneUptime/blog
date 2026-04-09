# How to Restore Mon Quorum Using the restore-quorum Command in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, Quorum, Recovery

Description: Step-by-step guide to using Rook's restore-quorum operation to recover a Ceph cluster when monitor quorum cannot be re-established automatically.

---

When a Ceph cluster loses monitor quorum and normal recovery methods fail, Rook provides a `restore-quorum` operation that rebuilds the quorum from a single surviving monitor. This is a last-resort procedure - it modifies the monitor map and should only be used when you have verified that normal quorum cannot be restored.

## When to Use restore-quorum

Use this procedure when:
- At least one monitor is still running and healthy
- Two or more monitors are permanently lost (node failure, data corruption)
- Normal mon pod restarts have failed to restore quorum
- `ceph status` hangs or times out

Do not use this if monitors are only temporarily unavailable due to a network issue or node reboot.

## Prerequisites

Identify the surviving monitor. Check which mon pods are running:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mon -o wide
```

```text
NAME                  READY   STATUS      RESTARTS   AGE   NODE
rook-ceph-mon-a-xxx   2/2     Running     0          10d   node-1
rook-ceph-mon-b-xxx   0/2     OOMKilled   5          2h    node-2
rook-ceph-mon-c-xxx   0/2     Error       3          2h    node-3
```

In this example, `mon-a` on `node-1` is the surviving monitor.

## Prerequisites: Install the kubectl-rook-ceph Plugin

The restore-quorum operation is provided by the `kubectl-rook-ceph` plugin. Install it with krew:

```bash
kubectl krew install rook-ceph
```

Or download the binary directly from the [kubectl-rook-ceph releases page](https://github.com/rook/kubectl-rook-ceph/releases).

## Initiating restore-quorum

Run the restore-quorum command, specifying the ID of the surviving monitor:

```bash
kubectl rook-ceph mons restore-quorum a
```

The value `a` corresponds to the monitor ID of the surviving monitor. The plugin will prompt you to confirm by typing `yes-really-restore` before proceeding.

## Monitoring the Restore Process

The plugin will output progress as it works. It performs the following steps:

1. Validates the specified monitor is operational
2. Scales down the Rook operator to prevent interference
3. Scales down all other (failed) monitor deployments
4. Extracts the monmap from the surviving monitor's data store
5. Removes failed monitors from the monmap
6. Injects the updated monmap back into the surviving monitor
7. Updates the `rook-ceph-mon-endpoints` ConfigMap
8. Restarts the surviving monitor with the corrected monmap
9. Deletes resources (deployments, services, PVCs) for the failed monitors
10. Scales the Rook operator back up

After step 9, the plugin will prompt you to type `continue` to proceed with scaling the operator back up.

## Verifying Recovery

Once the operation completes, verify the cluster is back in quorum:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

```text
cluster:
  id:     xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  health: HEALTH_WARN
          1 mon is down (out of 3)
          Degraded data redundancy...

services:
  mon: 1 daemons, quorum a (age 5m)
  mgr: a(active, since 3m)
  osd: 6 osds: 6 up, 6 in
```

The cluster will initially show HEALTH_WARN because only one monitor is active. The Rook operator will then automatically add new monitors to restore the full three-monitor configuration.

## Rebuilding the Monitor Ensemble

After restoring quorum with a single monitor, allow Rook to rebuild the full set:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mon -w
```

Rook will create new mon deployments on available nodes. This process takes several minutes. Once three monitors are healthy and in quorum, the cluster is fully recovered.

## Post-Recovery Checks

After full quorum is restored, verify OSD health and data recovery:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
```

Any PGs that were degraded due to the quorum loss should begin recovering automatically.

## Summary

The `restore-quorum` command in the `kubectl-rook-ceph` plugin automates the low-level monitor map manipulation needed to re-establish quorum from a single surviving monitor. After using this procedure, the Rook operator automatically rebuilds the full three-monitor ensemble.

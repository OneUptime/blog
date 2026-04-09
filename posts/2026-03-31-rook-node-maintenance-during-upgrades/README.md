# How to Handle Node Maintenance During Rook Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Node, Maintenance, Upgrade

Description: Learn how to safely perform node maintenance during Rook-Ceph upgrades using drain, cordon, and OSD maintenance flags to prevent data rebalancing.

---

During Rook upgrades, individual Kubernetes nodes may need maintenance - OS patches, kernel updates, or hardware replacement. Performing node maintenance without preparation can trigger Ceph data rebalancing, degrading cluster performance and potentially causing timeouts for storage consumers.

## Understanding Ceph's Response to Node Loss

When a Ceph OSD goes offline, Ceph starts a timer before initiating recovery:
- `osd_heartbeat_grace`: 20 seconds before an OSD is marked down
- `mon_osd_down_out_interval`: 600 seconds (10 minutes) before an OSD is marked out and rebalancing begins

For brief maintenance operations, Ceph will wait before rebalancing. For longer maintenance, you should proactively set OSDs to maintenance mode.

## Setting OSD noout Flag

Before taking a node offline, set the `noout` flag to prevent Ceph from marking OSDs as out and triggering rebalancing:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd set noout
```

Verify the flag is set:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd dump | grep flags
```

```text
flags sortbitwise,recovery_deletes,purged_snapdirs,pglog_hardlimit,noout
```

## Setting Additional Maintenance Flags

For extended maintenance, set additional flags to prevent other automated operations:

```bash
# Prevent rebalancing
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd set norebalance

# Prevent recovery operations
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd set norecover
```

## Draining the Kubernetes Node

With Ceph maintenance flags set, drain the Kubernetes node:

```bash
NODE="node-3"

# Cordon to prevent new pods being scheduled
kubectl cordon $NODE

# Drain existing pods
kubectl drain $NODE \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=300s
```

The `--ignore-daemonsets` flag is needed because Rook deploys some components as DaemonSets. The `--delete-emptydir-data` flag handles pods using emptyDir volumes.

## Handling OSD Pods During Drain

OSD pods are managed by Deployments (not DaemonSets) in recent Rook versions. When you drain a node, OSD pods on that node will terminate. Ceph will mark those OSDs as down but the `noout` flag prevents them from being marked out.

Verify OSD state after drain:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
```

```text
ID  CLASS  WEIGHT    TYPE NAME          STATUS  REWEIGHT  PRI-AFF
-1         0.10797   root default
-3         0.03599       host node-3
 4    hdd  0.01199           osd.4        down   1.00000  1.00000
 5    hdd  0.01199           osd.5        down   1.00000  1.00000
 6    hdd  0.01199           osd.6        down   1.00000  1.00000
```

Status shows `down` but not `out` - this is correct with `noout` set.

## Performing Maintenance

With the node drained and `noout` set, perform your maintenance:

```bash
# SSH to node and apply updates
ssh node-3 "sudo apt update && sudo apt upgrade -y && sudo reboot"
```

Or if replacing hardware, follow your hardware procedures.

## Returning the Node to Service

After maintenance, uncordon the node and wait for pods to reschedule:

```bash
kubectl uncordon $NODE

# Watch OSD pods return
kubectl -n rook-ceph get pods -l app=rook-ceph-osd -w | grep $NODE
```

Wait for all OSD pods on the node to return to Running state. Then verify Ceph sees the OSDs as up:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree | grep $NODE
```

## Unset Maintenance Flags

Only unset maintenance flags after confirming the node is fully operational and OSDs are up:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd unset noout
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd unset norebalance
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd unset norecover
```

Check cluster health after unsetting flags:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

Any brief degradation from data written during the maintenance window will self-heal quickly.

## Automating Node Maintenance

Wrap the maintenance procedure in a script to ensure flags are always unset after maintenance:

```bash
#!/bin/bash
set -euo pipefail

NODE="${1}"
NAMESPACE="rook-ceph"

echo "Setting maintenance flags..."
kubectl -n "$NAMESPACE" exec deploy/rook-ceph-tools -- ceph osd set noout

trap 'echo "Unsetting noout flag..."; kubectl -n "$NAMESPACE" exec deploy/rook-ceph-tools -- ceph osd unset noout' EXIT

echo "Cordoning $NODE..."
kubectl cordon "$NODE"
kubectl drain "$NODE" --ignore-daemonsets --delete-emptydir-data --timeout=300s

echo "Node $NODE is ready for maintenance."
echo "Press Enter when maintenance is complete..."
read -r

kubectl uncordon "$NODE"
echo "Node $NODE returned to service. Flags will be unset automatically."
```

## Summary

Node maintenance during Rook upgrades requires setting the Ceph `noout` flag before draining the node to prevent unwanted rebalancing, draining the node with `kubectl drain`, performing maintenance, uncordoning the node and waiting for OSD pods to return, and then unsetting maintenance flags only after verifying all OSDs are back online. Using a trap in maintenance scripts ensures flags are always cleaned up even if the script exits unexpectedly.

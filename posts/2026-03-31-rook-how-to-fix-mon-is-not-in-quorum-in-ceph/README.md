# How to Fix 'mon is not in quorum' in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, Quorum, Troubleshooting

Description: Restore Ceph monitor quorum after a mon failure by diagnosing pod issues, network connectivity, and using monmap manipulation to force quorum.

---

## Why MON Quorum Matters

Ceph monitors use a Paxos-based consensus protocol to maintain the authoritative cluster map. A Ceph cluster requires a majority (quorum) of monitors to function. With 3 monitors, at least 2 must be healthy; with 5 monitors, at least 3 must be healthy.

When a monitor falls out of quorum, the cluster cannot make configuration changes and may become read-only or completely unavailable.

## Step 1 - Check MON Status

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon stat
```

Output with a missing monitor:

```text
e5: 3 mons at {a=[v2:10.0.0.1:3300/0,v1:10.0.0.1:6789/0],b=[v2:10.0.0.2:3300/0,v1:10.0.0.2:6789/0],c=[v2:10.0.0.3:3300/0,v1:10.0.0.3:6789/0]}, election epoch 12, quorum 0,1 a,b
```

MON `c` is out of quorum - it is listed in the monmap but absent from the quorum list.

Also check:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph quorum_status | python3 -m json.tool
```

## Step 2 - Check MON Pod Status

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mon
```

If a MON pod is in `Pending`, `CrashLoopBackOff`, or `Error` state:

```bash
kubectl -n rook-ceph describe pod <mon-pod-name>
kubectl -n rook-ceph logs <mon-pod-name>
```

Common errors:

```text
error reading monmap: (2) No such file or directory
auth: failed to find entity client.mon
ERROR: error reading monmap
```

## Step 3 - Check Node Availability

If the node hosting the failing MON is down or unreachable:

```bash
kubectl get nodes
```

If the node is `NotReady`, the MON pod cannot run. Kubernetes will reschedule it after the node comes back or after the pod eviction timeout (~5 minutes by default).

Force the pod to reschedule immediately:

```bash
kubectl -n rook-ceph delete pod <mon-pod-name>
```

Rook's operator will recreate the MON on an available node.

## Step 4 - Check Network Connectivity

MONs must communicate with each other on ports 3300 (v2) and 6789 (v1). Test connectivity:

```bash
# From one MON node, test connectivity to another
nc -zv <mon-b-ip> 3300
nc -zv <mon-b-ip> 6789
```

If ports are blocked, check:
- Kubernetes NetworkPolicies
- Host firewall rules (`iptables -L`, `ufw status`)
- Cloud security groups

## Step 5 - Wait for Rook to Self-Heal

Rook's operator monitors MON health and will automatically:
1. Detect a failed MON
2. Reschedule it on another node
3. Update the monmap with the new address

Give Rook 5-10 minutes to self-heal. Monitor progress:

```bash
watch kubectl -n rook-ceph get pods -l app=rook-ceph-mon
```

Watch the operator logs:

```bash
kubectl -n rook-ceph logs deploy/rook-ceph-operator -f | grep -i mon
```

## Step 6 - Manually Remove a Dead MON (Advanced)

If Rook cannot automatically recover the MON, you may need to manually remove it from the cluster.

**Only do this if you have 3+ monitors and are removing one that is permanently dead.**

Remove the dead monitor from the Ceph cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon remove c
```

Update the Rook MON ConfigMap to reflect the change:

```bash
kubectl -n rook-ceph edit configmap rook-ceph-mon-endpoints
```

Remove the dead MON's entry from the ConfigMap data.

Then delete the MON deployment if it still exists:

```bash
kubectl -n rook-ceph delete deploy rook-ceph-mon-c
kubectl -n rook-ceph delete pvc rook-ceph-mon-c
```

Rook will deploy a new MON to replace it.

## Step 7 - Force Quorum with Only One MON (Emergency)

If you have only one MON running and need to force quorum for emergency access, you must manipulate the monmap to remove the dead monitors so the surviving one can form a quorum of one:

```bash
# Get into the MON pod directly
kubectl -n rook-ceph exec -it <mon-pod> -- bash

# Extract the monmap from the surviving monitor
ceph-mon -i <surviving-mon-id> --extract-monmap /tmp/monmap

# Remove dead monitors from the monmap
monmaptool /tmp/monmap --rm <dead-mon-id-1>
monmaptool /tmp/monmap --rm <dead-mon-id-2>

# Inject the modified monmap back
ceph-mon -i <surviving-mon-id> --inject-monmap /tmp/monmap
```

After injecting the monmap, restart the MON pod by deleting it so Rook recreates it. The surviving monitor will now form a quorum of one. You can then re-add new monitors to restore redundancy.

This is destructive and should only be used when the cluster is completely inaccessible.

## Step 8 - Verify Quorum Is Restored

After recovery:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon stat
```

Expected:

```text
e8: 3 mons at {...}, election epoch 14, quorum 0,1,2 a,b,c
```

All three monitors should appear in the quorum list.

## Summary

MON quorum loss in Ceph is a serious condition that requires prompt attention. In Rook-Ceph, the operator handles most recovery scenarios automatically by rescheduling failed MON pods. For persistent failures, manually remove the dead MON from the cluster, delete its resources, and let Rook deploy a replacement. Always maintain an odd number of monitors (3 or 5) to ensure quorum is achievable even with one failure.

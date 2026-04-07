# How to Check Monitor Map and Quorum Status in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, Quorum, Diagnostic

Description: Learn how to inspect the Ceph monitor map and quorum status using Rook toolbox commands to verify cluster health and monitor membership.

---

## What Is the Monitor Map?

The monitor map (monmap) is a critical data structure in Ceph that contains the list of all monitors, their network addresses, and the cluster's unique identifier (FSID). Every Ceph daemon reads the monmap on startup to discover how to connect to the monitor cluster. The monmap has an epoch number that increments each time monitors are added or removed.

## Viewing the Monitor Map

From the Rook toolbox, dump the current monmap:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon dump
```

Sample output:

```text
epoch 3
fsid a3a21ed9-4e1f-4aa1-9c87-8a55f2e99b64
last_changed 2026-03-31 10:14:22.304916
created 2026-03-01 08:00:00.000000
min_mon_release 18 (reef)
election_strategy: classic
0: [v2:10.96.0.10:3300/0,v1:10.96.0.10:6789/0] mon.a
1: [v2:10.96.0.11:3300/0,v1:10.96.0.11:6789/0] mon.b
2: [v2:10.96.0.12:3300/0,v1:10.96.0.12:6789/0] mon.c
```

## Checking Quorum Status

View which monitors are currently in quorum:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph quorum_status
```

For formatted output:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph quorum_status --format json-pretty
```

The `quorum_names` array lists monitors currently participating in quorum.

## Checking Monitor Statistics

Get high-level monitor statistics:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon stat
```

Output:

```text
e3: 3 mons at {a=[v2:10.96.0.10:3300/0],b=[v2:10.96.0.11:3300/0],c=[v2:10.96.0.12:3300/0]},
election epoch 12, leader 0 a, quorum 0,1,2 a,b,c
```

The `leader` field shows which monitor is currently leading the Paxos consensus.

## Viewing per-Monitor Health

Inspect individual monitor health metrics:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph health detail
```

## Comparing Monmap Epoch Across Monitors

If monitors disagree on the monmap epoch, they may fail to synchronize. Check each monitor's epoch:

```bash
for mon in a b c; do
  echo "Monitor $mon epoch:"
  kubectl -n rook-ceph exec -it rook-ceph-mon-${mon}-<suffix> -- \
    ceph-mon --mon-data /var/lib/ceph/mon/ceph-${mon} \
    --extract-monmap /tmp/monmap && \
    monmaptool --print /tmp/monmap 2>/dev/null | grep epoch
done
```

## Checking Monitor Connectivity from Pods

Verify that other Ceph daemons can reach all monitors:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mon.* version
```

This sends a command to all monitors and shows their Ceph versions, confirming connectivity.

## Summary

The monitor map and quorum status are the primary indicators of Ceph cluster health at the control plane level. Use `ceph mon dump` to inspect monitor membership and addresses, `ceph quorum_status` to confirm which monitors are active, and `ceph mon stat` for a concise status summary. Regular monitoring of these values helps detect membership changes and connectivity issues before they cause outages.

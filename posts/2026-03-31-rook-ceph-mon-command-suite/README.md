# How to Use the ceph mon Command Suite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CLI, Monitor, Operation, High Availability, Quorum

Description: Use the ceph mon commands to manage Ceph monitors, check quorum status, add or remove monitors, and diagnose monitor-related issues.

---

## Introduction

Ceph monitors (MONs) maintain the authoritative cluster map and coordinate all Ceph daemons. The `ceph mon` command suite provides tools for inspecting monitor health, managing the monitor map, and recovering from quorum loss.

## Checking Monitor Status

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# Quick monitor status
ceph mon stat

# Detailed monitor dump
ceph mon dump

# Check quorum
ceph quorum_status | python3 -m json.tool
```

Example `mon stat` output:

```yaml
e5: 3 mons at {a=[v2:10.0.0.1:3300/0,v1:10.0.0.1:6789/0],...}, election epoch 12, leader 0 a, quorum 0,1,2 a,b,c
```

## Listing Monitor Members

```bash
ceph mon dump
```

Output includes the full monmap with monitor names, ranks, and addresses:

```text
epoch 5
fsid 12345678-abcd-efgh-ijkl-123456789abc
last_changed 2025-01-01T00:00:00.000000+0000
created 2024-01-01T00:00:00.000000+0000
min_mon_release 18 (reef)
election_strategy: 1
0: [v2:10.0.0.1:3300/0,v1:10.0.0.1:6789/0] mon.a
1: [v2:10.0.0.2:3300/0,v1:10.0.0.2:6789/0] mon.b
2: [v2:10.0.0.3:3300/0,v1:10.0.0.3:6789/0] mon.c
```

## Checking Quorum Members

```bash
ceph quorum_status | python3 -c "
import sys, json
s = json.load(sys.stdin)
print('Leader:', s['quorum_leader_name'])
print('In quorum:', s['quorum_names'])
print('Monmap epoch:', s['monmap']['epoch'])
"
```

## Adding a Monitor

In Rook, add a monitor by increasing the count in CephCluster:

```yaml
spec:
  mon:
    count: 5  # Increased from 3
```

Via CLI (for manual clusters):

```bash
ceph mon add d 10.0.0.4:6789
```

## Removing a Monitor

```bash
# Remove a specific monitor
ceph mon rm b
```

In Rook, scale down:

```yaml
spec:
  mon:
    count: 3  # Decreased from 5
```

## Checking Monitor Versions

```bash
ceph tell mon.\* version
```

## Getting Monitor Configuration

```bash
ceph config get mon mon_osd_down_out_interval
ceph config get mon mon_clock_drift_allowed
```

## Triggering a Monitor Election

If a monitor needs to temporarily leave and rejoin the quorum (for example, if the leader is suspected to be unhealthy):

```bash
# Force a specific monitor to leave and rejoin quorum
ceph tell mon.a quorum exit
ceph tell mon.a quorum enter
```

## Checking Monitor Log

```bash
ceph log last 20 cluster
```

Or from Kubernetes:

```bash
kubectl -n rook-ceph logs rook-ceph-mon-a-<pod-id> | tail -50
```

## Monitor Compact (Reduce Store Size)

If monitor stores grow large:

```bash
ceph tell mon.a compact
ceph tell mon.b compact
ceph tell mon.c compact
```

## Summary

The `ceph mon` command suite manages the most critical Ceph daemons - the monitors that maintain cluster consensus. Regular use of `ceph mon stat` and `ceph quorum_status` ensures monitors are healthy. In Rook environments, monitor scaling is handled through the CephCluster CRD, but CLI commands remain essential for deep diagnostics and emergency quorum recovery operations.

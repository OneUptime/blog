# How to Handle Split-Brain Scenarios in Rook Stretch Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Split-Brain, Stretch Cluster, Recovery

Description: Learn how to detect and recover from split-brain scenarios in Rook-Ceph stretch clusters where both sites lose visibility of each other simultaneously.

---

## Overview

A split-brain in a Rook-Ceph stretch cluster occurs when zone-a and zone-b lose connectivity with each other AND the tiebreaker arbiter is unreachable from both sides simultaneously. In this scenario, neither site can form quorum, and the cluster will halt I/O to protect data consistency. This guide explains how to detect this condition and recover safely.

## Understanding Split-Brain in Stretch Mode

In a properly configured stretch cluster, the tiebreaker arbiter prevents split-brain. If zone-a loses connectivity to zone-b, the arbiter can still communicate with one side, granting quorum to that side while blocking the other. A true split-brain only occurs when:

1. Zone-a cannot reach zone-b
2. Zone-a cannot reach the arbiter
3. Zone-b cannot reach the arbiter

In this case, no side has quorum and writes are blocked cluster-wide.

## Detecting a Split-Brain Event

Signs of a split-brain include all monitors reporting `HEALTH_ERR` and I/O blocking on all zones:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph quorum_status -f json-pretty
```

If `quorum_names` is empty, no quorum exists:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph quorum_status -f json | python3 -c \
  "import sys,json; d=json.load(sys.stdin); print('quorum:', d['quorum_names'])"
```

## Step 1 - Restore Network Connectivity

The safest resolution is always to restore connectivity first. Check the network paths between zones:

```bash
# From zone-a node, test reachability to zone-b monitors
ping <zone-b-monitor-ip>
traceroute <zone-b-monitor-ip>

# Test arbiter reachability
ping <arbiter-monitor-ip>
```

Fix any firewall rules, routing issues, or physical connectivity problems before attempting manual quorum recovery.

## Step 2 - Force Quorum on One Side (Last Resort)

If network restoration is not immediately possible and you must restore I/O on one side, you can recover quorum by modifying the monmap to include only the surviving monitors. This should only be done on the site you are certain has the most recent data.

First, scale down the Rook operator to prevent interference:

```bash
kubectl -n rook-ceph scale deployment rook-ceph-operator --replicas=0
```

Identify and access a surviving monitor pod directly (not the tools pod, since admin commands require the monitor's local environment):

```bash
# List monitor pods and their zones
kubectl -n rook-ceph get pods -l app=rook-ceph-mon -o wide

# Exec into a surviving monitor pod
kubectl -n rook-ceph exec -it <surviving-mon-pod> -- /bin/bash
```

Extract the monmap, remove unreachable monitors, and inject the modified monmap:

```bash
# Extract the current monmap
ceph-mon -i <mon-id> --extract-monmap /tmp/monmap

# View the monmap to identify all monitors
monmaptool --print /tmp/monmap

# Remove each unreachable monitor (repeat for each)
monmaptool /tmp/monmap --rm <unreachable-mon-name>

# Inject the modified monmap
ceph-mon -i <mon-id> --inject-monmap /tmp/monmap
```

Exit the pod, restart it, and scale the operator back up:

```bash
kubectl -n rook-ceph delete pod <surviving-mon-pod>
kubectl -n rook-ceph scale deployment rook-ceph-operator --replicas=1
```

This is a destructive operation. If run incorrectly, it can permanently destroy the cluster. Use it only when all network restoration options are exhausted. After quorum is restored, if the cluster remains in degraded stretch mode, you can force recovery:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd force_recovery_stretch_mode --yes-i-really-mean-it
```

## Step 3 - Verify Data Integrity After Recovery

Once quorum is restored and both sites rejoin:

```bash
# Check for inconsistent placement groups
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump | grep -i inconsistent

# Run a scrub on affected pools
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg deep-scrub <pg-id>

# Check for any unrecoverable objects
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph health detail | grep -i unfound
```

## Preventing Split-Brain

Best practices to minimize split-brain risk:

```yaml
# Ensure arbiter monitor has reliable network path to both zones
# Place arbiter in a third independent facility or cloud region
# Use dedicated management network for monitor communication
# Configure redundant network paths between zones

# Monitor connectivity between zones
spec:
  mon:
    count: 5
    allowMultiplePerNode: false
    stretchCluster:
      failureDomainLabel: topology.kubernetes.io/zone
      subFailureDomain: host
      zones:
      - name: zone-a
      - name: zone-b
      - name: zone-c
        arbiter: true
```

## Summary

Split-brain in Rook stretch clusters only occurs when all inter-zone and arbiter connectivity is lost simultaneously. The primary resolution is always network restoration. Forcing quorum is a last-resort operation that risks data inconsistency. After any split-brain event, run deep scrubs to verify data integrity and review network architecture to prevent recurrence. Placing the arbiter in a genuinely independent third location is the most effective prevention strategy.

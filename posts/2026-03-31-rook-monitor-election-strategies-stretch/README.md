# How to Configure Monitor Election Strategies for Stretch Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, Election Strategy, Stretch Cluster

Description: Learn how to configure Ceph monitor election strategies in Rook stretch clusters to control quorum behavior during site failures and network partitions.

---

## Overview

Ceph monitors use an election strategy to determine which monitors can form a quorum and allow the cluster to accept I/O. In a stretch cluster, the default `classic` strategy may not correctly handle zone-level failures. Ceph provides the `connectivity` election strategy specifically for stretch deployments, which uses a more sophisticated scoring mechanism to prefer monitors that are reachable from more peers.

## Election Strategy Options

Ceph supports three monitor election strategies:

```text
classic      - Default, uses ranks and connectivity for simple clusters
disallow     - Allows specific monitors to be excluded from leadership
connectivity - Designed for stretch clusters, uses connectivity scores
```

For stretch clusters, always use the `connectivity` strategy.

## Configuring the Connectivity Strategy

Set the election strategy via the Ceph toolbox or as part of the Rook CephCluster configuration:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon set election_strategy connectivity
```

Verify the setting:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon dump | grep election_strategy
```

## How Connectivity Strategy Works

In connectivity mode, each monitor tracks its connectivity score - the number of other monitors it can reach. During an election, monitors with higher connectivity scores are preferred for leadership. This prevents a single isolated monitor from winning an election when it cannot actually coordinate with the cluster.

In a 5-monitor stretch cluster (2 in zone-a, 2 in zone-b, 1 arbiter in zone-c):

```text
Zone A: mon.a, mon.b
Zone B: mon.c, mon.d
Zone C: mon.arbiter (tiebreaker)
```

If zone-a loses network, monitors in zone-b and the arbiter can still reach each other and form quorum (3 of 5). Zone-a monitors have a low connectivity score and will not win elections.

## Setting the Tiebreaker Monitor

Configure which monitor acts as the arbiter for the stretch cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon set_location mon.arbiter zone=zone-c

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon enable_stretch_mode mon.arbiter stretch_rule zone
```

Or configure this via the Rook CephCluster CRD:

```yaml
spec:
  mon:
    count: 5
    stretchCluster:
      failureDomainLabel: topology.kubernetes.io/zone
      zones:
      - name: zone-a
        arbiter: false
      - name: zone-b
        arbiter: false
      - name: zone-c
        arbiter: true
```

## Verifying Monitor Location Labels

Monitors must have correct location labels for the connectivity strategy to work properly:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon dump
```

Look for the `crush_location` field for each monitor. It should reflect the zone label:

```text
crush_location {zone=zone-a}
```

## Monitoring Election Events

Track monitor election events in the cluster log:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph log last 50 | grep -i election

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon stat
```

Frequent re-elections indicate connectivity instability between zones and warrant investigation.

## Summary

The `connectivity` election strategy is essential for Rook stretch clusters because it ensures quorum decisions favor monitors that are actually reachable across sites. Configuring the tiebreaker arbiter correctly and setting proper zone location labels allows Ceph to gracefully handle zone failures without requiring manual intervention. Always verify monitor location assignments and enable stretch mode before deploying production workloads on a stretch cluster.

# How to Configure Monitor Election Strategies in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, Election, High Availability

Description: Learn how to configure Ceph monitor election strategies including classic, disallow, and connectivity modes for different cluster topologies.

---

## Ceph Monitor Elections

Ceph monitors form a quorum using the Paxos consensus algorithm. When a monitor fails or restarts, the remaining monitors hold an election to select a leader. The election strategy controls how this process works.

Understanding election strategies is important for clusters deployed across multiple availability zones, data centers, or with specific tie-breaking requirements.

## Available Election Strategies

Ceph supports three election strategies:

- **classic** - the default, uses monitor rank (lowest rank wins) as a tie-breaker
- **disallow** - prevents specific monitors from becoming leader (useful for witness monitors)
- **connectivity** - selects the leader based on which monitor can reach the most peers (best for stretch clusters)

## Viewing the Current Strategy

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon dump
```

The output includes the `election_strategy` field showing the current strategy. You can also check quorum status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph quorum_status
```

## Setting the Classic Strategy

The classic strategy is the default and works for most single-site deployments:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon set election_strategy classic
```

## Setting the Disallow Strategy

Use the disallow strategy when you have a tiebreaker monitor that should never become the leader:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon set election_strategy disallow

# Prevent mon-c from being elected leader
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon add disallowed_leader mon-c
```

This is useful in stretched deployments where a third-site monitor serves only as a quorum voter, not a leader.

## Setting the Connectivity Strategy

For stretched clusters across two data centers, the connectivity strategy selects the leader that has the best connectivity to all peers:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon set election_strategy connectivity
```

This prevents a monitor in a degraded network segment from becoming leader and causing inconsistent behavior.

## Configuring a Stretch Cluster Monitor Topology

In Rook, configure a stretch cluster with five monitors across three zones (two data zones and one arbiter zone):

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  mon:
    count: 5
    allowMultiplePerNode: false
    stretchCluster:
      failureDomainLabel: topology.kubernetes.io/zone
      subFailureDomain: host
      zones:
        - name: zone-a
          arbiter: false
        - name: zone-b
          arbiter: false
        - name: zone-c
          arbiter: true
```

## Monitor Quorum Requirements

A Ceph monitor quorum requires a majority: more than half the monitors must be reachable. With three monitors, two must be available. With five monitors, three must be available.

Check current quorum:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon stat
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph quorum_status
```

## Summary

Ceph monitor election strategies control which monitor becomes leader during elections. Use `classic` for single-site clusters, `disallow` to designate witness monitors that should never lead, and `connectivity` for stretched deployments to ensure the best-connected monitor leads. Configure stretch topologies in Rook via the `stretchCluster` field in the `CephCluster` CR.

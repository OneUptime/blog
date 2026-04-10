# How to Understand Ceph High Availability with Paxos Consensus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Paxos, HighAvailability, Monitor, Kubernetes

Description: Learn how Ceph monitors use Paxos consensus to maintain a consistent cluster map and ensure high availability even during partial monitor failures.

---

## Why Ceph Monitors Need Consensus

Ceph monitors maintain the authoritative cluster maps (OSD map, CRUSH map, PG map, etc.) that all components rely on. If two monitors held conflicting views of cluster state - for example, disagreeing on whether an OSD is up or down - the cluster could make contradictory routing decisions and corrupt data.

Paxos consensus ensures all monitors agree on every map update before it becomes authoritative. This prevents split-brain scenarios where different parts of the cluster see different states.

## How Paxos Works in Ceph

Ceph uses a simplified Paxos variant for monitor consensus:

1. **Leader election**: Monitors elect a single leader (called the `leader` monitor). All map updates are proposed by the leader.
2. **Proposal**: The leader proposes a map update to all monitors.
3. **Quorum vote**: Each monitor acknowledges the proposal.
4. **Commit**: Once a majority (quorum) acknowledges, the leader commits the change and distributes the updated map.

A majority quorum means `floor(N/2) + 1` monitors must agree. With 3 monitors, 2 must agree. With 5 monitors, 3 must agree.

## Monitor Quorum

```bash
kubectl exec -it rook-ceph-tools -n rook-ceph -- bash

# Check quorum status
ceph quorum_status | python3 -m json.tool

# List monitors and their roles
ceph mon stat
```

Example output:

```json
{
  "election_epoch": 12,
  "quorum": [0, 1, 2],
  "quorum_names": ["a", "b", "c"],
  "quorum_leader_name": "a",
  "monmap": {
    "epoch": 3,
    "mons": [
      {"name": "a", "addr": "10.0.0.1:6789"},
      {"name": "b", "addr": "10.0.0.2:6789"},
      {"name": "c", "addr": "10.0.0.3:6789"}
    ]
  }
}
```

## Minimum Monitor Count

Always deploy an odd number of monitors (3 or 5) to maintain a clear majority:

| Monitors | Quorum Required | Tolerable Failures |
|----------|----------------|-------------------|
| 1 | 1 | 0 |
| 3 | 2 | 1 |
| 5 | 3 | 2 |

In Rook, configure monitor count:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  mon:
    count: 3
    allowMultiplePerNode: false
```

## Monitor Leader vs Peon

The Paxos leader handles all write proposals. Other monitors (peons) can serve read requests for the current maps. If the leader fails, the remaining monitors elect a new leader via another Paxos round.

```bash
# View which monitor is the current leader
ceph mon stat
```

## Diagnosing Monitor Issues

When fewer than quorum monitors are available, the monitor service becomes unavailable. Existing client I/O may continue based on cached OSD maps, but no new map updates, authentication, or configuration changes can occur:

```bash
# Check for monitor warnings
ceph health detail | grep mon

# View monitor election history
ceph mon dump

# Restart a stuck monitor pod
kubectl rollout restart deployment rook-ceph-mon-a -n rook-ceph
```

## Clock Skew

Ceph monitors rely on synchronized clocks for lease management and timeout handling. Excessive clock skew between monitors causes `clock skew detected` health warnings and can trigger unnecessary leader re-elections.

```bash
# Check for clock skew warnings
ceph health detail | grep clock

# List monitor pods to identify which nodes to check for NTP sync
kubectl get pods -n rook-ceph -o wide | grep mon
```

## Summary

Ceph monitor high availability is built on Paxos consensus, which ensures all cluster map updates are agreed upon by a majority of monitors before taking effect. This eliminates split-brain scenarios and provides fault tolerance up to `floor(N/2)` monitor failures. Deploying 3 or 5 monitors in Rook-Ceph, keeping clocks synchronized, and monitoring quorum health are the essential practices for maintaining a highly available Ceph control plane.

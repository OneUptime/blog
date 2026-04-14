# How Dapr Placement Service Uses Raft Consensus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Raft, Consensus, Actor, Distributed System

Description: Understand how Dapr's placement service uses the Raft consensus algorithm to maintain a consistent actor placement table across multiple placement service instances.

---

## Overview

Dapr's placement service must maintain a single consistent view of which application instance hosts each actor type. To achieve this across multiple placement service replicas, Dapr implements the Raft consensus algorithm internally, allowing the placement cluster to tolerate node failures while continuing to serve actor routing.

## What Raft Provides

Raft is a consensus algorithm that ensures all nodes in a cluster agree on the same sequence of log entries, even when some nodes fail. In the Dapr placement service:
- Log entries represent actor host registration and deregistration events
- All placement nodes apply the same log in the same order
- The resulting actor placement table is identical on all nodes

## Leader and Follower Roles

The placement cluster elects one node as the Raft leader. Only the leader:
- Accepts new actor registration requests from sidecars
- Appends entries to the Raft log
- Disseminates the updated placement table to sidecars

Follower nodes:
- Replicate all log entries from the leader
- Participate in leader elections when the leader becomes unavailable
- Serve as standbys ready to take over leadership

```bash
# Check which placement pod is the Raft leader
kubectl logs -n dapr-system dapr-placement-server-0 | grep -i "became leader\|raft leader"
kubectl logs -n dapr-system dapr-placement-server-1 | grep -i "became leader\|raft leader"
kubectl logs -n dapr-system dapr-placement-server-2 | grep -i "became leader\|raft leader"
```

## Quorum Requirements

A Raft cluster of N nodes can tolerate up to (N-1)/2 failures while maintaining a quorum. For 3 placement nodes, 1 failure is tolerated. For 5 nodes, 2 failures are tolerated.

| Replicas | Failures Tolerated | Quorum Size |
|---|---|---|
| 1 | 0 | 1 |
| 3 | 1 | 2 |
| 5 | 2 | 3 |

## Deploying a 3-Node Placement Cluster

```bash
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --set global.ha.enabled=true \
  --set dapr_placement.ha=true \
  --reuse-values
```

## Log Compaction and Snapshots

The Raft log can grow unbounded without compaction. The placement service takes periodic snapshots of the actor table and truncates the log to prevent excessive memory usage.

```bash
# Monitor placement service memory usage
kubectl top pods -n dapr-system -l app=dapr-placement-server
```

## Observing Raft Activity

```bash
# Raft-related metrics
curl http://dapr-placement-server-0.dapr-placement-server.dapr-system:9090/metrics | grep raft

# Actor registration events
kubectl logs -n dapr-system dapr-placement-server-0 | grep "host added\|host removed"
```

## What Happens During a Leader Failure

When the current leader fails:
1. Followers detect the missing leader after the keep-alive timeout
2. A follower initiates an election and requests votes
3. The follower with the most up-to-date log wins the election
4. The new leader resumes accepting actor registrations
5. Sidecars reconnect and re-register their actor types

Leader failover is typically brief, but actor calls can fail during the transition. Configure retries in your actor clients or resiliency policy to cover that window.

## Summary

Dapr's placement service uses Raft consensus to maintain a consistent actor placement table across all placement nodes, ensuring that every sidecar gets the same routing information. Deploy a 3-node or 5-node placement cluster in production to tolerate node failures, and configure actor retry policies in your applications to handle the brief unavailability that occurs during leader elections.

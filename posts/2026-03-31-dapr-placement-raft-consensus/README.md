# How to Configure Dapr Placement Service Raft Consensus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Placement Service, Raft, Consensus, Configuration

Description: Understand how the Dapr placement service uses Raft consensus, which HA settings are exposed through Helm, and how to verify quorum and leader election in production.

---

The Dapr placement service uses the Raft distributed consensus algorithm to maintain a consistent actor placement table across multiple replicas. In practice, Dapr exposes high-availability settings such as replica count and keep-alive intervals through Helm; it does not document raw per-node Raft timer flags as part of the supported operator workflow.

## How Raft Works in Placement Service

In a 3-replica placement service deployment:
1. One replica is elected as the Raft leader
2. All actor table updates go through the leader
3. The leader replicates updates to followers before committing
4. If the leader fails, remaining replicas elect a new leader
5. The new leader resumes handling updates after election

## Raft Quorum Requirements

Raft requires a majority of replicas to be healthy for writes to succeed:

| Replicas | Required for Quorum | Fault Tolerance |
|----------|--------------------|-----------------| 
| 1 | 1 | 0 |
| 3 | 2 | 1 |
| 5 | 3 | 2 |

## Viewing Raft Configuration

Check the current Raft configuration via placement service logs:

```bash
kubectl logs dapr-placement-server-0 -n dapr-system | grep -i "raft\|config\|cluster"
```

## Configuring Placement HA via Helm

```bash
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --set global.ha.enabled=true \
  --set dapr_placement.ha=true \
  --set dapr_placement.keepAliveTime=2s \
  --set dapr_placement.keepAliveTimeout=3s \
  --wait
```

## Operator-Facing Settings

**Replica count**: When HA is enabled, the Helm chart hardcodes the placement service to `3` replicas. This is not configurable via a separate Helm value; enabling HA automatically sets the replica count.

**`dapr_placement.keepAliveTime`**: Controls how often peers send keep-alive traffic.

**`dapr_placement.keepAliveTimeout`**: Controls how long a peer waits before treating another peer as unavailable.

**`global.ha.enabled`** and **`dapr_placement.ha`**: Enable the HA topology that renders placement as a multi-replica Raft-backed control-plane service.

Avoid hand-crafting placement peer lists or undocumented Raft flags. The supported path is to let the Helm chart render the StatefulSet and peer discovery configuration.

## Checking Raft Leader

```bash
# The leader will log "entering leader state" (requires debug log level)
for i in 0 1 2; do
  echo "=== Replica $i ==="
  kubectl logs dapr-placement-server-$i -n dapr-system | grep -i "entering leader state\|leader" | tail -3
done
```

## Recovering from Split-Brain

A split-brain occurs when network partitions cause multiple nodes to think they can lead. Raft prevents committed writes without quorum, so the practical failure mode is loss of actor placement updates until a healthy majority is restored.

To resolve a suspected split-brain:
1. Verify connectivity between all placement pods
2. Restore quorum before changing settings
3. Restart only failed or isolated placement pods if needed
4. Check that only one pod logs "entering leader state"

```bash
kubectl get pods -n dapr-system -l app=dapr-placement-server -o wide
```

## Summary

Raft consensus in the Dapr placement service provides strong consistency guarantees for actor table updates. The supported tuning surface is the documented Helm configuration for HA, replica count, and keep-alive behavior, not ad-hoc placement binary flags. Focus on odd replica counts, healthy quorum, and leader-election visibility in logs and metrics to operate the service safely.

# Configure Dapr Placement Service for High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Placement Service, High Availability, Kubernetes, Actor

Description: Configure the Dapr placement service for high availability with multiple replicas and Raft consensus to ensure actor placement remains available during node failures.

---

## Overview

The Dapr placement service manages actor distribution across the cluster. When it becomes unavailable, actor invocations fail. For production deployments, the placement service should run with at least three replicas forming a Raft consensus group to tolerate node failures without service interruption.

## Default vs. High Availability Mode

By default, Dapr's Helm chart deploys one placement service replica. In HA mode, it deploys three replicas that elect a leader via Raft.

```bash
# Check current placement service replicas
kubectl get statefulset dapr-placement-server -n dapr-system

# Single replica (not HA)
# NAME                     READY   AGE
# dapr-placement-server    1/1     10m
```

## Enable High Availability in Helm

```bash
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --set global.ha.enabled=true \
  --reuse-values
```

This enables the HA control-plane topology and sets `dapr-placement-server` to three replicas automatically.

## Verify the HA Deployment

```bash
kubectl get pods -n dapr-system -l app=dapr-placement-server

# Expected output with 3 replicas:
# dapr-placement-server-0   1/1   Running   0   5m
# dapr-placement-server-1   1/1   Running   0   5m
# dapr-placement-server-2   1/1   Running   0   5m
```

## Configure Pod Disruption Budget

Ensure Kubernetes won't evict too many placement pods simultaneously:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: dapr-placement-pdb
  namespace: dapr-system
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: dapr-placement-server
```

## Configure Anti-Affinity for Node Spread

In custom deployments, add pod anti-affinity to spread placement pods across availability zones:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: dapr-placement-server
  namespace: dapr-system
spec:
  replicas: 3
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: dapr-placement-server
              topologyKey: "topology.kubernetes.io/zone"
```

## Verify Leader Election

The Raft group elects one leader. Check which pod is the current leader:

```bash
# Check placement service logs for Raft leader info
kubectl logs -n dapr-system dapr-placement-server-0 | grep -i "leader\|raft"

# Expected log lines:
# time="..." level=info msg="Raft node is elected as leader"
# time="..." level=info msg="Placement service is running as leader"
```

## Test Failover

Simulate a leader failure and verify placement service remains available:

```bash
# Delete the leader pod
kubectl delete pod dapr-placement-server-0 -n dapr-system

# Verify remaining pods elect a new leader
kubectl logs -n dapr-system dapr-placement-server-1 | grep "leader"

# Verify actor invocations still succeed
curl -X POST http://localhost:3500/v1.0/actors/OrderActor/order-123/method/GetStatus
```

## Resource Recommendations

```yaml
resources:
  requests:
    cpu: "100m"
    memory: "100Mi"
  limits:
    cpu: "500m"
    memory: "256Mi"
```

Placement service memory usage scales with the number of actor instances in the cluster. Monitor actual usage and increase limits if actor counts are high.

## Summary

High availability for the Dapr placement service requires at least three replicas running Raft consensus to tolerate single-node failures without downtime. Enable HA mode via the Helm `global.ha.enabled` flag, add a PodDisruptionBudget to prevent simultaneous evictions, and use pod anti-affinity to spread replicas across availability zones. This configuration ensures actor placement remains available even during node failures or rolling updates.

# How to Use Dapr Actors with the Placement Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Placement Service, Distributed System, Routing

Description: Understand how the Dapr placement service distributes actor instances across hosts using consistent hashing, and how to configure and monitor it in production.

---

The Dapr placement service is the backbone of actor distribution. It maintains a registry of all actor host instances and their assigned actor types, enabling the Dapr sidecar to route actor method calls to the correct host.

## What the Placement Service Does

1. Maintains a cluster-wide registry of app instances that host actor types
2. Uses consistent hashing to assign actor IDs to host instances
3. Notifies all sidecars when host membership changes (scaling up/down, pod restarts)
4. Enables actor rebalancing during rolling deployments

## Placement Service Architecture

```text
Client Sidecar
     |
     v
Placement Service ---- Hash Ring -----> Host Sidecar (Pod A)
                                 \----> Host Sidecar (Pod B)
                                  \---> Host Sidecar (Pod C)
```

The placement service does not handle actor method traffic directly - it only provides routing information (which host holds a given actor ID).

## Checking Placement Service Status

In self-hosted mode:

```bash
# Placement service runs on port 50005 by default
dapr list
```

In Kubernetes:

```bash
kubectl get pods -n dapr-system | grep placement
kubectl logs -n dapr-system dapr-placement-server-0
```

## Verifying Actor Registration

```bash
# Query placement HTTP API for registered actor types
curl http://localhost:8080/placement/state | jq .
```

Expected response:

```json
{
  "tableVersion": 1,
  "hostList": [
    {
      "name": "counter-service-pod-abc123",
      "namespace": "default",
      "appId": "counter-service",
      "actorTypes": ["Counter", "BankAccount"],
      "updatedAt": "2026-03-31T14:00:00Z"
    }
  ]
}
```

## Placement Service Configuration

In the Dapr Helm chart:

```yaml
# values.yaml
dapr_placement:
  replicaCount: 3    # Use 3 replicas for HA
  maxAPILevel: 10
  logLevel: info
```

## How Actor IDs are Routed

The placement service uses a virtual node consistent hash ring. Each host is assigned multiple virtual nodes for better distribution:

```text
Actor ID "counter-001" -> hash -> maps to Host Pod B
Actor ID "counter-002" -> hash -> maps to Host Pod A
Actor ID "counter-003" -> hash -> maps to Host Pod C
```

This ensures even distribution across hosts without manual partitioning.

## Monitoring Placement Service

Key metrics to watch:

```bash
# Number of registered actor hosts
curl http://dapr-placement-server:9090/metrics | grep placement

# Sidecar placement connection errors
curl http://localhost:9090/metrics | grep dapr_placement
```

Prometheus alert for placement connectivity:

```yaml
- alert: DaprPlacementDisconnected
  expr: dapr_placement_runtimes_total == 0
  for: 1m
  annotations:
    summary: "No actor runtimes registered with placement service"
```

## Rebalancing During Deployments

When you roll out a new deployment version, actors rebalance from old pods to new pods. Enable draining to prevent dropped calls:

```yaml
annotations:
  dapr.io/app-id: "counter-service"
spec:
  strategy:
    rollingUpdate:
      maxUnavailable: 0  # Ensure new pods are ready before old ones are removed
      maxSurge: 1
```

Combined with actor drain settings:

```json
{
  "drainOngoingCallTimeout": "15s",
  "drainRebalancedActors": true
}
```

## Summary

The Dapr placement service is a critical infrastructure component that enables transparent actor distribution across multiple hosts. Understanding its role in routing and rebalancing helps you design deployments that maintain actor availability during scaling events and rolling updates. Monitoring placement service connectivity and actor registration ensures early detection of distribution failures before they impact end-user requests.

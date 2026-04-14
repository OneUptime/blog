# How to Configure the Dapr Placement Service In-Memory Raft Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Placement, Raft, Actor, Distributed System

Description: Learn how the Dapr placement service uses an in-memory Raft store for actor table consensus and how to configure it for production deployments.

---

## Overview

The Dapr placement service maintains the actor placement table using a built-in Raft consensus algorithm. In self-hosted and single-replica development mode, the placement service stores its Raft log in memory by default. In HA Kubernetes deployments, the Helm chart defaults to persistent storage via a PVC, but you can override this with `forceInMemoryLog: true` to use the in-memory store instead.

## Understanding the In-Memory Store

The in-memory Raft store keeps the placement log and snapshots only in RAM. When the placement service pod restarts:
- The Raft log is lost
- All sidecars must re-register their actor type tables
- Actor table dissemination restarts from scratch

This is acceptable in many Kubernetes environments because sidecar re-registration is fast, but it means actor calls may fail briefly after a placement service restart.

## Supported Configuration Surface

Configure the placement service through the Dapr Helm chart rather than hand-authoring placement container arguments:

```yaml
global:
  ha:
    enabled: true

dapr_placement:
  ha: true
  cluster:
    forceInMemoryLog: true
```

## Checking Placement Service Health

```bash
# Check if placement pods are running
kubectl get pods -n dapr-system -l app=dapr-placement-server

# Check placement service logs
kubectl logs -n dapr-system dapr-placement-server-0 --tail=50
```

## Raft Leader Election

The placement service runs in a 3-node HA configuration for production. One node becomes the Raft leader and handles all actor table updates. The others are followers that replicate state.

```bash
# Identify the Raft leader
kubectl logs -n dapr-system dapr-placement-server-0 | grep -i "leader\|elected"
```

## Handling Placement Service Restarts

Configure retry policies in your application to handle brief unavailability during placement restarts:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: actor-placement-resilience
spec:
  policies:
    retries:
      placementRetry:
        policy: exponential
        maxInterval: 10s
        maxRetries: 5
  targets:
    actors:
      OrderActor:
        retry: placementRetry
```

## Monitoring Raft Metrics

```bash
# Query placement service Prometheus metrics
curl http://dapr-placement-server-0.dapr-system:9090/ | grep placement
```

Key metrics to watch:
- `dapr_placement_runtimes_total` - total number of connected runtimes (sidecars)
- `dapr_placement_actor_runtimes_total` - total number of actor-hosting runtimes
- `dapr_placement_leader_status` - whether this instance is the Raft leader (1) or not (0)

## Summary

The Dapr placement service uses an in-memory Raft store to maintain consensus on the actor placement table across its cluster. While the in-memory store is fast and requires no external storage, you should configure the placement service through the supported Helm values, run it in a 3-node HA configuration, and configure actor retry policies to handle brief disruptions during restarts. Monitor the placement service metrics to detect registration issues early.

# How to Scale the Dapr Placement Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Placement, Scaling, Kubernetes, High Availability

Description: Learn how to scale the Dapr placement service for high availability and production workloads, including replica counts, resource tuning, and monitoring.

---

## Overview

The Dapr placement service is the central coordinator for actor routing. In production, it must be highly available and performant enough to handle registration events from all application sidecars. This post covers how to scale the placement service and tune it for large actor deployments.

## Default Installation

By default, Dapr installs the placement service as a single-replica StatefulSet. This is fine for development but provides no fault tolerance.

```bash
# Check current placement replicas
kubectl get statefulset -n dapr-system dapr-placement-server
```

## Scaling to High Availability

Enable HA mode to scale the placement service to 3 replicas (the replica count is hardcoded and cannot be changed) through the Helm release that manages the Dapr control plane:

```bash
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --set global.ha.enabled=true \
  --set dapr_placement.ha=true \
  --set dapr_placement.keepAliveTime=2s
```

## Resource Configuration

For large clusters with many actors, tune CPU and memory limits:

```yaml
# Helm values for placement service resources
dapr_placement:
  resources:
    requests:
      cpu: "100m"
      memory: "128Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"
```

## Pod Disruption Budget

Prevent simultaneous eviction of all placement pods during cluster maintenance:

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

## Spreading Across Zones

Use topology spread constraints to distribute placement pods across availability zones:

```yaml
# Add to placement StatefulSet spec
topologySpreadConstraints:
- maxSkew: 1
  topologyKey: topology.kubernetes.io/zone
  whenUnsatisfiable: DoNotSchedule
  labelSelector:
    matchLabels:
      app: dapr-placement-server
```

## Monitoring Placement Service Load

```bash
# Check placement service metrics
curl http://dapr-placement-server-0.dapr-system:9090/metrics | grep -E "placement|raft"

# Key metrics:
# dapr_placement_runtimes_total - number of registered runtimes (sidecars)
# dapr_placement_actor_runtimes_total - number of registered actor runtimes
```

```bash
# Watch for placement errors in application sidecars
kubectl logs -l app=my-actor-app -c daprd | grep -i "placement.*error\|failed.*placement"
```

## Connection Keep-Alive Tuning

The documented placement knobs are the HA and keep-alive settings surfaced by the Helm chart. Use them to tighten failure detection without relying on undocumented internal parameters:

```yaml
dapr_placement:
  keepAliveTime: 2s
  keepAliveTimeout: 3s
```

## Summary

Scale the Dapr placement service to 3 replicas in production by enabling HA mode, which provides Raft consensus fault tolerance. Use the documented Helm values such as `global.ha.enabled`, `dapr_placement.ha`, and the keep-alive settings rather than relying on undocumented placement internals. Combine that with Pod Disruption Budgets, topology spread constraints, and metrics-based monitoring to keep actor routing healthy at scale.

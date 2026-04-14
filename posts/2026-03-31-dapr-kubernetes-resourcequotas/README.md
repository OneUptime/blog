# How to Use Dapr with Kubernetes ResourceQuotas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, ResourceQuota, Namespace, Resource Management

Description: Apply Kubernetes ResourceQuotas to namespaces running Dapr services to enforce CPU, memory, and object count limits across teams and environments.

---

## Overview

ResourceQuotas cap the total resource consumption within a namespace. When multiple Dapr-enabled services share a namespace, quotas prevent any single team or application from exhausting cluster resources and affecting others.

## Creating a ResourceQuota for a Dapr Namespace

Define CPU and memory limits for all resources in a namespace:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dapr-production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
    limits.cpu: "40"
    limits.memory: "80Gi"
    pods: "100"
    services: "50"
    persistentvolumeclaims: "20"
```

Apply it:

```bash
kubectl apply -f resourcequota.yaml
kubectl describe resourcequota dapr-production-quota -n production
```

## Accounting for Dapr Sidecars in Quota Planning

Each Dapr-enabled pod contains both the app container and the `daprd` sidecar. Account for sidecar resources in your quota calculations:

```bash
# Example: 10 services, each with 2 replicas
# App container: 200m CPU, 128Mi memory each
# Dapr sidecar: 100m CPU, 64Mi memory each
# Total per pod: 300m CPU, 192Mi memory
# Total for 20 pods: 6 CPU, 3.75Gi memory (requests)
# Plan quota with 20-30% headroom
```

## Scoped ResourceQuotas

Apply quotas only to specific priority classes used by Dapr services:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: high-priority-quota
  namespace: production
spec:
  hard:
    requests.cpu: "10"
    requests.memory: "20Gi"
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - high-priority
```

## Tracking Quota Usage

Monitor namespace quota consumption:

```bash
kubectl get resourcequota -n production
kubectl describe resourcequota dapr-production-quota -n production

# Output shows:
# Name:            dapr-production-quota
# Resource         Used   Hard
# --------         ---    ---
# limits.cpu       8      40
# limits.memory    16Gi   80Gi
# pods             34     100
```

## Handling Quota Exceeded Errors

When a deployment fails due to quota limits:

```bash
kubectl describe replicaset order-service-xyz -n production
# Error: exceeded quota: dapr-production-quota,
# requested: limits.memory=256Mi, used: limits.memory=79.75Gi, limited: limits.memory=80Gi

# Options:
# 1. Reduce sidecar memory limit
kubectl patch deployment order-service -n production --type=json \
  -p='[{"op":"replace","path":"/spec/template/metadata/annotations/dapr.io~1sidecar-memory-limit","value":"128Mi"}]'

# 2. Increase the quota (requires cluster admin)
kubectl patch resourcequota dapr-production-quota -n production --type=json \
  -p='[{"op":"replace","path":"/spec/hard/limits.memory","value":"120Gi"}]'
```

## Summary

Kubernetes ResourceQuotas are essential for multi-team environments where multiple Dapr applications share cluster resources. When planning quotas, always account for both application container resources and Dapr sidecar resources, since each enabled pod runs two containers. Use `kubectl describe resourcequota` to monitor consumption and set quotas with adequate headroom for scaling events.

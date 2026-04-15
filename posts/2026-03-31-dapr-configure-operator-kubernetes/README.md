# How to Configure Dapr Operator on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Operator, Control Plane, Configuration

Description: Configure the Dapr Operator on Kubernetes to manage component CRD reconciliation, set resource limits, enable HA mode, and tune operator behavior.

---

## What Is the Dapr Operator?

The Dapr Operator is a Kubernetes controller that watches Dapr component CRDs (Components, Configurations, Resiliency, Subscriptions, HTTPEndpoints) and distributes their configuration to running Dapr sidecars. It is a critical piece of the Dapr control plane.

## Viewing Current Operator Configuration

```bash
# Check operator pod status
kubectl get pods -n dapr-system -l app=dapr-operator

# View operator logs
kubectl logs -n dapr-system -l app=dapr-operator --tail=50

# Check operator deployment spec
kubectl describe deployment dapr-operator -n dapr-system
```

## Configuring the Operator via Helm

```yaml
# dapr-operator-values.yaml
global:
  nodeSelector:
    kubernetes.io/os: linux
  tolerations: []
dapr_operator:
  replicaCount: 2
  logLevel: info
  watchInterval: 10s
  maxPodRestartsPerMinute: 20
  resources:
    requests:
      cpu: "100m"
      memory: "256Mi"
    limits:
      cpu: "500m"
      memory: "512Mi"
```

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  -f dapr-operator-values.yaml
```

## Understanding the Watchdog Feature

The Dapr Operator includes a watchdog that periodically polls all pods in the cluster and checks whether pods annotated with `dapr.io/enabled=true` have a Dapr sidecar injected. If a pod is missing its sidecar, the watchdog deletes the pod so Kubernetes recreates it with proper sidecar injection:

```bash
# Configure the watchdog in the operator
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set dapr_operator.watchInterval=10s \
  --set dapr_operator.maxPodRestartsPerMinute=20
```

## Checking Component Reconciliation

```bash
# List all Dapr components the operator is managing
kubectl get components.dapr.io -A

# Verify a component was picked up by the operator
kubectl describe component statestore -n default

# Watch for recent events related to Dapr components
kubectl get events -n default --sort-by='.lastTimestamp'
```

## Configuring Operator RBAC

The Dapr Operator needs ClusterRole permissions to watch all namespaces. Verify it has the correct permissions:

```bash
# Check the operator's ClusterRoleBinding
kubectl get clusterrolebinding dapr-operator

# View the operator's service account permissions
kubectl describe clusterrole dapr-operator
```

## Restarting the Operator

When components are not being reconciled, restart the operator:

```bash
kubectl rollout restart deployment/dapr-operator -n dapr-system
kubectl rollout status deployment/dapr-operator -n dapr-system
```

## Summary

The Dapr Operator manages CRD reconciliation and keeps sidecar configurations synchronized with the cluster state. Configure it via Helm values to set replica count for HA, resource limits, and tune the watchdog feature. Monitoring operator logs helps diagnose issues where component changes are not propagating to running sidecars.

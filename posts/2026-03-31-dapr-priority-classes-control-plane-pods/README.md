# How to Set Priority Classes for Dapr Control Plane Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Priority Class, Scheduling, Control Plane

Description: Set Kubernetes PriorityClasses on Dapr control plane pods to prevent eviction during resource pressure and ensure critical infrastructure stays running.

---

## Why Priority Classes Matter for Dapr

When Kubernetes nodes run low on resources, the scheduler evicts low-priority pods to make room for higher-priority ones. Dapr control plane components - especially the sentry (mTLS) and operator - are critical infrastructure. Without priority classes, they can be evicted just like any application pod.

## Creating a Priority Class for Dapr

```yaml
# dapr-control-plane-priority.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: dapr-control-plane-critical
value: 1000000
globalDefault: false
description: "Priority class for Dapr control plane components"
preemptionPolicy: PreemptLowerPriority
```

```bash
kubectl apply -f dapr-control-plane-priority.yaml

# Verify
kubectl get priorityclass dapr-control-plane-critical
```

## Applying Priority Class via Helm

```yaml
# dapr-priority-values.yaml
dapr_operator:
  priorityClassName: dapr-control-plane-critical

dapr_sentry:
  priorityClassName: dapr-control-plane-critical

dapr_sidecar_injector:
  priorityClassName: dapr-control-plane-critical

dapr_placement:
  priorityClassName: dapr-control-plane-critical
```

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  -f dapr-priority-values.yaml
```

## Using System-Level Priority Classes

Kubernetes ships with built-in system priority classes that you can also use:

```bash
# List built-in priority classes
kubectl get priorityclass

# system-cluster-critical: 2000000000
# system-node-critical: 2000001000 (highest)
# Use these for Dapr control plane in critical deployments
```

```yaml
dapr_operator:
  priorityClassName: system-cluster-critical
dapr_sentry:
  priorityClassName: system-cluster-critical
```

## Applying Priority Class to App Pods

For application pods, use a lower-priority class:

```yaml
# dapr-app-priority.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: dapr-app-high
value: 100000
globalDefault: false
description: "Priority for high-priority Dapr-enabled applications"
```

Reference it in your deployment:

```yaml
spec:
  template:
    spec:
      priorityClassName: dapr-app-high
      containers:
      - name: myapp
        image: myregistry/myapp:latest
```

## Verifying Priority Class Assignment

```bash
# Check control plane pods have the priority class
kubectl get pods -n dapr-system -o custom-columns=\
"NAME:.metadata.name,PRIORITY:.spec.priorityClassName"

# Check effective priority values
kubectl get pods -n dapr-system -o jsonpath=\
'{range .items[*]}{.metadata.name}{"\t"}{.spec.priority}{"\n"}{end}'
```

## Summary

Setting PriorityClasses on Dapr control plane pods ensures they are not evicted during node resource pressure, protecting the critical mTLS (sentry), component reconciliation (operator), and actor placement infrastructure. Use Helm values to assign priority classes during installation or upgrades, and consider using the built-in `system-cluster-critical` class for maximum protection.

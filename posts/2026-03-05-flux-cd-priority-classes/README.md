# How to Configure Flux CD with Priority Classes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Priority Classes, Scheduling, Reliability, Resource Management

Description: Learn how to assign Kubernetes Priority Classes to Flux CD controllers to ensure they are scheduled and retained during node pressure events.

---

Kubernetes Priority Classes determine the scheduling order and eviction priority of pods. When node resources are scarce, the scheduler evicts lower-priority pods to make room for higher-priority ones. Flux CD controllers are critical infrastructure components -- if they are evicted, your cluster stops reconciling its desired state from Git. Assigning appropriate Priority Classes to Flux controllers ensures they remain running even during resource contention.

## Understanding Priority Classes

A PriorityClass is a cluster-scoped resource that assigns a numeric priority value to pods. Kubernetes uses this value in two ways:

1. **Scheduling**: Higher-priority pods are scheduled before lower-priority pods when resources are limited.
2. **Preemption**: If a high-priority pod cannot be scheduled, the scheduler may evict lower-priority pods to free resources.

Kubernetes ships with two built-in Priority Classes:
- `system-cluster-critical` (priority value: 2000000000)
- `system-node-critical` (priority value: 2000001000)

## Prerequisites

- A Kubernetes cluster (v1.24 or later)
- Flux CD installed and bootstrapped
- kubectl configured with cluster-admin access

## Step 1: Create a Custom Priority Class for Flux

Rather than using the system-level Priority Classes (which are reserved for core Kubernetes components), create a dedicated Priority Class for Flux:

```yaml
# infrastructure/priority-classes/flux-critical.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: flux-critical
value: 1000000
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "Priority class for Flux CD controllers. Ensures GitOps reconciliation remains available during resource pressure."
```

The value of 1000000 is high enough to preempt most application workloads but lower than the system-level Priority Classes, avoiding interference with core Kubernetes components like kube-apiserver or etcd.

You can also create a lower-priority class for less critical Flux components:

```yaml
# infrastructure/priority-classes/flux-standard.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: flux-standard
value: 500000
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "Standard priority for optional Flux CD components like notification-controller."
```

## Step 2: Assign Priority Classes to Flux Controllers

Use Kustomize patches in your Flux bootstrap configuration to assign Priority Classes:

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Critical controllers: source, kustomize, helm
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: add
        path: /spec/template/spec/priorityClassName
        value: flux-critical
  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      - op: add
        path: /spec/template/spec/priorityClassName
        value: flux-critical
  - target:
      kind: Deployment
      name: helm-controller
    patch: |
      - op: add
        path: /spec/template/spec/priorityClassName
        value: flux-critical
  # Standard priority for notification controller
  - target:
      kind: Deployment
      name: notification-controller
    patch: |
      - op: add
        path: /spec/template/spec/priorityClassName
        value: flux-standard
```

## Step 3: Deploy Priority Classes Before Controllers

The Priority Classes must exist before Flux controllers reference them. Since Flux manages its own components, you need to handle the ordering carefully.

Option 1: Apply Priority Classes manually before bootstrapping Flux:

```bash
kubectl apply -f infrastructure/priority-classes/flux-critical.yaml
kubectl apply -f infrastructure/priority-classes/flux-standard.yaml
```

Option 2: Include the Priority Classes in the gotk-components.yaml file before the controller Deployments. Since YAML documents are applied in order, this ensures the Priority Classes exist first.

Option 3: Use a separate Flux Kustomization with dependency ordering:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: priority-classes
  namespace: flux-system
spec:
  interval: 1h
  path: ./infrastructure/priority-classes
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/flux-system
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: priority-classes
```

## Step 4: Assign Priority Classes to Image Automation Controllers

If you use image automation, assign Priority Classes to those controllers as well:

```yaml
patches:
  - target:
      kind: Deployment
      name: image-reflector-controller
    patch: |
      - op: add
        path: /spec/template/spec/priorityClassName
        value: flux-standard
  - target:
      kind: Deployment
      name: image-automation-controller
    patch: |
      - op: add
        path: /spec/template/spec/priorityClassName
        value: flux-standard
```

Image automation controllers are typically less critical than the core reconciliation controllers, so the standard priority is appropriate.

## Step 5: Create Application Priority Classes

Define Priority Classes for your application workloads deployed through Flux:

```yaml
# infrastructure/priority-classes/application-classes.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: app-critical
value: 100000
globalDefault: false
description: "For critical application workloads."
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: app-standard
value: 50000
globalDefault: true
description: "Default priority for standard application workloads."
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: app-batch
value: 10000
globalDefault: false
preemptionPolicy: Never
description: "For batch jobs that should not preempt other workloads."
```

The priority hierarchy becomes:

| Priority Class | Value | Use Case |
|----------------|-------|----------|
| system-cluster-critical | 2000000000 | Core Kubernetes components |
| flux-critical | 1000000 | Core Flux controllers |
| flux-standard | 500000 | Optional Flux components |
| app-critical | 100000 | Critical application services |
| app-standard | 50000 | Standard applications (default) |
| app-batch | 10000 | Batch jobs, non-preempting |

## Verifying the Configuration

After committing and reconciling:

```bash
# Verify Priority Classes exist
kubectl get priorityclasses

# Check that Flux controllers use the correct Priority Class
kubectl get pods -n flux-system -o custom-columns=\
NAME:.metadata.name,\
PRIORITY:.spec.priority,\
PRIORITY_CLASS:.spec.priorityClassName

# Verify the priority is applied
kubectl describe pod -n flux-system -l app=source-controller | grep "Priority"
```

## Testing Preemption Behavior

To verify that Flux controllers survive resource pressure:

```bash
# Create a pod that consumes significant resources (test only)
kubectl run resource-hog --image=nginx \
  --requests='cpu=4,memory=8Gi' \
  --limits='cpu=4,memory=8Gi' \
  --restart=Never

# Check if Flux pods remain scheduled
kubectl get pods -n flux-system -o wide
```

If the node cannot accommodate both the resource-hog pod and Flux controllers, the resource-hog should be preempted (or fail to schedule) because it has a lower priority.

## Summary

Assigning Priority Classes to Flux CD controllers ensures they remain scheduled and running during resource contention. Create a custom `flux-critical` Priority Class with a high value for core controllers (source, kustomize, helm) and a `flux-standard` class for optional components. This hierarchy guarantees that GitOps reconciliation continues even when application workloads compete for resources, while still respecting system-critical Kubernetes components.

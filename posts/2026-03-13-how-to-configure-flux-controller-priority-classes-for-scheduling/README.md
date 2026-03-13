# How to Configure Flux Controller Priority Classes for Scheduling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Priority Classes, Scheduling, Controllers

Description: Assign Kubernetes priority classes to Flux controllers to ensure they are scheduled before application workloads and protected from eviction.

---

## Why Priority Classes Matter for Flux

Flux controllers are infrastructure-critical components. If the kustomize-controller or source-controller gets evicted because the cluster is under memory pressure, your entire GitOps delivery pipeline stops. Kubernetes priority classes let you ensure that Flux controllers are scheduled with higher priority than regular application pods and are the last to be evicted when resources are scarce.

## How Priority Classes Work

A PriorityClass assigns a numeric priority value to pods. The Kubernetes scheduler uses this value to determine scheduling order, and the kubelet uses it for eviction ordering. Higher values mean higher priority. System-critical pods like kube-apiserver typically use values above 1,000,000,000.

## Creating a Priority Class for Flux

```yaml
# clusters/my-cluster/flux-system/flux-priority-class.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: flux-system-critical
value: 1000000
globalDefault: false
preemptionPolicy: PreemptLowerPriority
description: "Priority class for Flux CD controllers"
```

A value of 1,000,000 is high enough to take precedence over most application workloads (which default to 0) but low enough to not compete with system-critical components.

## Assigning the Priority Class to Controllers

### Create the Patch

```yaml
# clusters/my-cluster/flux-system/priority-class-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      priorityClassName: flux-system-critical
```

### Apply to All Controllers

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
  - flux-priority-class.yaml
patches:
  - path: priority-class-patch.yaml
    target:
      kind: Deployment
      name: source-controller
  - path: priority-class-patch.yaml
    target:
      kind: Deployment
      name: kustomize-controller
  - path: priority-class-patch.yaml
    target:
      kind: Deployment
      name: helm-controller
  - path: priority-class-patch.yaml
    target:
      kind: Deployment
      name: notification-controller
```

### Apply the Changes

```bash
git add clusters/my-cluster/flux-system/
git commit -m "Add priority class for Flux controllers"
git push
```

## Preemption Behavior

With `preemptionPolicy: PreemptLowerPriority`, the scheduler can evict lower-priority pods to make room for Flux controllers. This means that if a node runs out of resources, application pods (priority 0) will be evicted before Flux controllers (priority 1,000,000).

If you do not want Flux controllers to preempt other workloads, set:

```yaml
preemptionPolicy: Never
```

With this setting, the controllers still benefit from eviction protection but will not cause other pods to be preempted during scheduling.

## Choosing a Priority Value

| Priority Value | Typical Use |
|---------------|-------------|
| 0 | Default for all pods without a priority class |
| 100,000 | Non-critical infrastructure |
| 1,000,000 | Critical infrastructure (Flux, monitoring, ingress) |
| 100,000,000 | Cluster-critical add-ons |
| 2,000,000,000 | System-critical (kube-system) |

For Flux, a value between 100,000 and 1,000,000 is appropriate. Choose a value that fits your existing priority class hierarchy.

## Verifying the Configuration

```bash
kubectl get deployment -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.template.spec.priorityClassName}{"\n"}{end}'
```

Each controller should show `flux-system-critical`.

## Checking Pod Priority

```bash
kubectl get pods -n flux-system -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.priority}{"\n"}{end}'
```

## Summary

Assigning a priority class to Flux controllers ensures they are scheduled promptly and protected from eviction during resource pressure. Create a PriorityClass with an appropriate value, apply it to all Flux controller deployments via a Kustomize patch, and choose a preemption policy that matches your operational requirements.

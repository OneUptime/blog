# How to Deploy LimitRanges with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, LimitRanges, Resource Management

Description: Learn how to deploy LimitRanges with ArgoCD to set default resource requests and limits, enforce minimum and maximum constraints, and prevent resource abuse per namespace.

---

LimitRanges are Kubernetes resources that enforce per-pod or per-container constraints within a namespace. While ResourceQuotas set the total resource ceiling for a namespace, LimitRanges control what individual pods and containers can request. They also provide default values for containers that do not specify their own resource requests and limits.

## Why LimitRanges Are Essential

Without LimitRanges, developers can deploy pods that either:

- Request zero resources, allowing them to be scheduled anywhere but potentially starving other pods
- Request enormous resources, consuming more than their fair share
- Have no limits, allowing unbounded CPU and memory consumption

LimitRanges solve these problems by setting defaults, minimums, and maximums for every container in a namespace.

## Basic LimitRange Configuration

Here is a LimitRange that sets sensible defaults and constraints:

```yaml
# platform/limits/production-limits.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limits
  namespace: production
spec:
  limits:
    - type: Container
      # Default limits (applied when not specified)
      default:
        cpu: 500m
        memory: 512Mi
      # Default requests (applied when not specified)
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      # Maximum allowed
      max:
        cpu: "4"
        memory: 8Gi
      # Minimum allowed
      min:
        cpu: 50m
        memory: 64Mi
      # Max ratio of limits to requests
      maxLimitRequestRatio:
        cpu: "10"
        memory: "4"
```

The `maxLimitRequestRatio` is often overlooked but important. It prevents containers from having a 50m CPU request but a 4 CPU limit, which would cause unpredictable scheduling behavior.

## LimitRange Types

LimitRanges can constrain different resource types:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: comprehensive-limits
  namespace: production
spec:
  limits:
    # Container-level constraints
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "4"
        memory: 8Gi
      min:
        cpu: 50m
        memory: 64Mi

    # Pod-level constraints (sum of all containers)
    - type: Pod
      max:
        cpu: "8"
        memory: 16Gi
      min:
        cpu: 100m
        memory: 128Mi

    # PVC size constraints
    - type: PersistentVolumeClaim
      max:
        storage: 100Gi
      min:
        storage: 1Gi
```

## ArgoCD Application for LimitRanges

Like ResourceQuotas, LimitRanges are platform-level resources:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: limit-ranges
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops
    targetRevision: main
    path: platform/limits
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true
      selfHeal: true  # Revert manual changes to limits
```

## Sync Wave Ordering

LimitRanges should be created early, before any workloads:

```yaml
# Wave -4: LimitRange (after namespace, before everything else)
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limits
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "-4"
spec:
  limits:
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
```

If you also have ResourceQuotas, create the LimitRange in the same wave or just after:

```
Wave -5: Namespace
Wave -4: ResourceQuota + LimitRange
Wave -3: NetworkPolicies
Wave 0:  Application workloads
```

## Environment-Specific LimitRanges

Different environments need different limits. Development needs generous defaults for debugging; production needs tight constraints for stability:

```yaml
# base/limitrange.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limits
spec:
  limits:
    - type: Container
      default:
        cpu: 200m
        memory: 256Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "2"
        memory: 4Gi
      min:
        cpu: 50m
        memory: 64Mi
```

Development overlay with higher max limits for profiling and debugging:

```yaml
# overlays/dev/limitrange-patch.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limits
spec:
  limits:
    - type: Container
      default:
        cpu: "1"
        memory: 1Gi
      defaultRequest:
        cpu: 200m
        memory: 256Mi
      max:
        cpu: "8"
        memory: 16Gi
      min:
        cpu: 10m
        memory: 32Mi
```

Production overlay with strict constraints:

```yaml
# overlays/production/limitrange-patch.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limits
spec:
  limits:
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 200m
        memory: 256Mi
      max:
        cpu: "4"
        memory: 8Gi
      min:
        cpu: 100m
        memory: 128Mi
      maxLimitRequestRatio:
        cpu: "5"
        memory: "4"
```

## LimitRanges and ResourceQuotas Together

These two resources complement each other. ResourceQuotas set the namespace total, and LimitRanges set per-container defaults and bounds:

```yaml
# Combined configuration for a namespace
---
# ResourceQuota: Total namespace limits
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "-4"
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
    pods: "100"
---
# LimitRange: Per-container defaults and bounds
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limits
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "-4"
spec:
  limits:
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "4"
        memory: 8Gi
```

Important: When a ResourceQuota is present, every container must have resource requests and limits. The LimitRange's default values satisfy this requirement automatically.

## Common LimitRange Scenarios

### Machine Learning Workloads

ML namespaces need higher memory limits but should still have reasonable defaults:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: ml-limits
  namespace: ml-training
spec:
  limits:
    - type: Container
      default:
        cpu: "2"
        memory: 4Gi
        nvidia.com/gpu: "1"
      defaultRequest:
        cpu: "1"
        memory: 2Gi
      max:
        cpu: "16"
        memory: 64Gi
        nvidia.com/gpu: "4"
      min:
        cpu: 500m
        memory: 1Gi
```

### Batch Processing

Batch jobs need flexibility for large data processing but should not monopolize the cluster:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: batch-limits
  namespace: batch-processing
spec:
  limits:
    - type: Container
      default:
        cpu: "1"
        memory: 2Gi
      defaultRequest:
        cpu: 500m
        memory: 1Gi
      max:
        cpu: "8"
        memory: 32Gi
    - type: Pod
      max:
        cpu: "16"
        memory: 64Gi
```

### Microservices

Microservices should be small and well-bounded:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: microservice-limits
  namespace: microservices
spec:
  limits:
    - type: Container
      default:
        cpu: 250m
        memory: 256Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "1"
        memory: 1Gi
      min:
        cpu: 50m
        memory: 64Mi
      maxLimitRequestRatio:
        cpu: "4"
        memory: "4"
```

## Handling LimitRange Violations

When a pod spec violates the LimitRange, Kubernetes rejects the creation. ArgoCD shows this as a sync error:

```
Error: pods "myapp-xyz" is forbidden:
  maximum cpu usage per Container is 4, but limit is 8
```

To fix this, either:

1. Update the pod spec to comply with the LimitRange
2. Update the LimitRange to accommodate the workload (through Git review)

## Verifying LimitRange Behavior

Check that defaults are being applied correctly:

```bash
# Deploy a pod without resource specs
kubectl run test --image=nginx -n production

# Check what resources were assigned
kubectl get pod test -n production -o jsonpath='{.spec.containers[0].resources}'

# Expected output shows the LimitRange defaults
# {"limits":{"cpu":"500m","memory":"512Mi"},"requests":{"cpu":"100m","memory":"128Mi"}}
```

## LimitRange for Init Containers

Init containers are treated differently from regular containers. Kubernetes takes the maximum of all init containers (since they run sequentially) and compares it against the sum of regular containers:

```yaml
spec:
  limits:
    - type: Container
      # These apply to both regular and init containers
      max:
        cpu: "4"
        memory: 8Gi
    - type: Pod
      # The pod max considers:
      # max(init containers) vs sum(regular containers)
      # whichever is higher
      max:
        cpu: "8"
        memory: 16Gi
```

## Summary

LimitRanges managed through ArgoCD provide a safety net for resource consumption at the container and pod level. They set sensible defaults for containers without explicit resource specs, enforce minimum and maximum bounds, and prevent resource abuse through limit-to-request ratios. Combined with ResourceQuotas for namespace-level limits, LimitRanges ensure fair resource distribution across your cluster. Use sync waves to create them before workloads, and use Kustomize overlays for environment-specific configurations. For the namespace-level companion to LimitRanges, see our guide on [deploying ResourceQuotas with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-deploy-resourcequotas/view).

# How to Configure LimitRanges with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, limitranges, kubernetes, gitops, resource management, namespace policies

Description: A practical guide to configuring Kubernetes LimitRanges with Flux CD to enforce default resource constraints and prevent resource abuse.

---

## Introduction

LimitRanges are a Kubernetes policy mechanism that constrains resource allocations for pods and containers within a namespace. They set default requests and limits, enforce minimum and maximum values, and control the ratio between requests and limits. When managed through Flux CD, LimitRanges become part of your GitOps pipeline, providing consistent resource policies across all environments.

This guide covers creating and managing LimitRanges with Flux CD, including best practices for multi-tenant clusters.

## Prerequisites

- A running Kubernetes cluster
- Flux CD installed and bootstrapped
- kubectl configured for cluster access
- Familiarity with Kubernetes resource requests and limits

## How LimitRanges Work

LimitRanges differ from Resource Quotas in scope:

- **Resource Quotas** limit total aggregate resources in a namespace
- **LimitRanges** constrain individual pod/container resource values

LimitRanges can enforce constraints on:

- Containers (default, min, max)
- Pods (min, max)
- PersistentVolumeClaims (min, max storage)

## Repository Structure

```
infrastructure/
  limit-ranges/
    base/
      kustomization.yaml
      container-limits.yaml
      pod-limits.yaml
      pvc-limits.yaml
    overlays/
      development/
        kustomization.yaml
        patch.yaml
      production/
        kustomization.yaml
        patch.yaml
```

## Container LimitRange

Define default resource requests and limits for containers.

```yaml
# infrastructure/limit-ranges/base/container-limits.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limit-range
spec:
  limits:
    - type: Container
      # Default limits applied when none are specified
      default:
        cpu: 500m
        memory: 512Mi
      # Default requests applied when none are specified
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      # Maximum allowed values
      max:
        cpu: "4"
        memory: 4Gi
      # Minimum allowed values
      min:
        cpu: 50m
        memory: 64Mi
      # Maximum ratio of limit to request
      # A ratio of 4 means limits can be at most 4x the request
      maxLimitRequestRatio:
        cpu: "4"
        memory: "4"
```

## Pod LimitRange

Set constraints at the pod level (sum of all containers).

```yaml
# infrastructure/limit-ranges/base/pod-limits.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: pod-limit-range
spec:
  limits:
    - type: Pod
      # Maximum total resources for all containers in a pod
      max:
        cpu: "8"
        memory: 8Gi
      # Minimum total resources for all containers in a pod
      min:
        cpu: 100m
        memory: 128Mi
```

## PersistentVolumeClaim LimitRange

Control the size of storage claims.

```yaml
# infrastructure/limit-ranges/base/pvc-limits.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: pvc-limit-range
spec:
  limits:
    - type: PersistentVolumeClaim
      # Maximum storage size per PVC
      max:
        storage: 50Gi
      # Minimum storage size per PVC
      min:
        storage: 1Gi
```

## Base Kustomization

Combine all LimitRange definitions.

```yaml
# infrastructure/limit-ranges/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - container-limits.yaml
  - pod-limits.yaml
  - pvc-limits.yaml
```

## Development Environment Overlay

Apply smaller limits for development namespaces.

```yaml
# infrastructure/limit-ranges/overlays/development/patch.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limit-range
spec:
  limits:
    - type: Container
      # Lower defaults for development
      default:
        cpu: 200m
        memory: 256Mi
      defaultRequest:
        cpu: 50m
        memory: 64Mi
      # Smaller maximums in development
      max:
        cpu: "1"
        memory: 1Gi
      min:
        cpu: 25m
        memory: 32Mi
---
apiVersion: v1
kind: LimitRange
metadata:
  name: pvc-limit-range
spec:
  limits:
    - type: PersistentVolumeClaim
      max:
        # Smaller PVCs in development
        storage: 10Gi
      min:
        storage: 512Mi
```

```yaml
# infrastructure/limit-ranges/overlays/development/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patchesStrategicMerge:
  - patch.yaml
```

## Production Environment Overlay

Production gets more generous limits.

```yaml
# infrastructure/limit-ranges/overlays/production/patch.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limit-range
spec:
  limits:
    - type: Container
      default:
        cpu: "1"
        memory: 1Gi
      defaultRequest:
        cpu: 250m
        memory: 256Mi
      max:
        cpu: "8"
        memory: 16Gi
      min:
        cpu: 50m
        memory: 64Mi
---
apiVersion: v1
kind: LimitRange
metadata:
  name: pod-limit-range
spec:
  limits:
    - type: Pod
      max:
        cpu: "16"
        memory: 32Gi
---
apiVersion: v1
kind: LimitRange
metadata:
  name: pvc-limit-range
spec:
  limits:
    - type: PersistentVolumeClaim
      max:
        storage: 200Gi
```

```yaml
# infrastructure/limit-ranges/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patchesStrategicMerge:
  - patch.yaml
```

## Flux Kustomization for Deployment

Deploy LimitRanges to specific namespaces using Flux.

```yaml
# clusters/my-cluster/limit-ranges/dev-namespaces.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: limitranges-dev
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/limit-ranges/overlays/development
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Apply to all development namespaces using patches
  patches:
    - target:
        kind: LimitRange
      patch: |
        - op: replace
          path: /metadata/namespace
          value: dev-team-alpha
```

```yaml
# clusters/my-cluster/limit-ranges/prod-namespaces.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: limitranges-prod
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/limit-ranges/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: production
  dependsOn:
    - name: namespaces
```

## Combining LimitRanges with Resource Quotas

For comprehensive resource governance, use both LimitRanges and Resource Quotas together.

```yaml
# infrastructure/namespace-policies/full-policy.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: container-defaults
spec:
  limits:
    - type: Container
      # These defaults ensure all pods have resource requests,
      # which is required when a ResourceQuota is active
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
spec:
  hard:
    requests.cpu: "16"
    limits.cpu: "32"
    requests.memory: 32Gi
    limits.memory: 64Gi
    pods: "50"
```

## Multi-Tenant LimitRange Strategy

For multi-tenant clusters, define per-tier limit configurations.

```yaml
# infrastructure/limit-ranges/tiers/free-tier.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: free-tier-limits
spec:
  limits:
    - type: Container
      default:
        cpu: 100m
        memory: 128Mi
      defaultRequest:
        cpu: 50m
        memory: 64Mi
      max:
        # Free tier gets minimal resources
        cpu: 500m
        memory: 512Mi
    - type: PersistentVolumeClaim
      max:
        storage: 5Gi
---
# infrastructure/limit-ranges/tiers/pro-tier.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: pro-tier-limits
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
    - type: PersistentVolumeClaim
      max:
        storage: 100Gi
```

## Flux Kustomization with Variable Substitution

Use Flux variable substitution to dynamically set limit values.

```yaml
# clusters/my-cluster/limit-ranges/dynamic-limits.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: limitranges-dynamic
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/limit-ranges/templated
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Substitute variables from ConfigMap and Secret
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-config
```

```yaml
# infrastructure/limit-ranges/templated/container-limits.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: container-limit-range
spec:
  limits:
    - type: Container
      default:
        cpu: ${DEFAULT_CPU_LIMIT}
        memory: ${DEFAULT_MEMORY_LIMIT}
      defaultRequest:
        cpu: ${DEFAULT_CPU_REQUEST}
        memory: ${DEFAULT_MEMORY_REQUEST}
```

## Verifying LimitRanges

After Flux applies the configuration, verify that LimitRanges are working.

```bash
# Check Flux reconciliation
flux get kustomizations | grep limitrange

# List LimitRanges in a namespace
kubectl get limitrange -n dev-team-alpha

# Describe a LimitRange to see all constraints
kubectl describe limitrange container-limit-range -n dev-team-alpha

# Test by creating a pod without resource specs (defaults should be applied)
kubectl run test-pod --image=nginx -n dev-team-alpha
kubectl get pod test-pod -n dev-team-alpha -o jsonpath='{.spec.containers[0].resources}'

# Test by creating a pod that exceeds limits (should be rejected)
kubectl run big-pod --image=nginx -n dev-team-alpha \
  --requests='cpu=100,memory=999Ti' --dry-run=server
```

## Troubleshooting

Common issues with LimitRanges:

- **Pod rejected with "minimum" error**: The pod's resource requests are below the LimitRange minimum. Increase the requests in the pod spec.
- **Pod rejected with "maximum" error**: The pod requests more than the LimitRange allows. Either reduce pod resources or increase the LimitRange max.
- **Unexpected defaults applied**: Check for multiple LimitRanges in the namespace, as they can overlap. Use `kubectl get limitrange -n <namespace>` to see all active ranges.
- **Init containers affected**: LimitRanges apply to init containers as well. Ensure your init containers comply with the configured limits.

## Conclusion

LimitRanges managed through Flux CD provide a robust mechanism for enforcing resource policies at the namespace level. By defining sensible defaults and constraints in Git, you prevent resource abuse, ensure fair allocation in multi-tenant clusters, and maintain consistency across environments. Combined with Resource Quotas, LimitRanges form a comprehensive resource governance strategy that is fully auditable and version-controlled.

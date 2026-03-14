# How to Configure Resource Quotas with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Resource Quota, Kubernetes, GitOps, Namespace Management, Resource governance

Description: Learn how to enforce resource consumption limits across Kubernetes namespaces using Resource Quotas managed through Flux CD.

---

## Introduction

Resource Quotas in Kubernetes provide constraints that limit aggregate resource consumption per namespace. They restrict the quantity of objects that can be created and the total amount of compute resources consumed. When managed through Flux CD, these quotas become part of your GitOps workflow, ensuring consistent resource governance across all environments.

This guide covers creating, deploying, and managing Resource Quotas with Flux CD, including patterns for multi-tenant clusters and environment-specific configurations.

## Prerequisites

- A running Kubernetes cluster
- Flux CD installed and bootstrapped
- Basic understanding of Kubernetes resource management
- kubectl access to your cluster

## Understanding Resource Quotas

Resource Quotas operate at the namespace level and can limit:

- Compute resources (CPU, memory)
- Storage resources (PersistentVolumeClaims)
- Object counts (pods, services, configmaps)

## Repository Structure

Organize your resource quota configurations in a clear directory structure.

```text
infrastructure/
  resource-quotas/
    base/
      kustomization.yaml
      compute-quota.yaml
      object-count-quota.yaml
      storage-quota.yaml
    overlays/
      development/
        kustomization.yaml
        patch.yaml
      staging/
        kustomization.yaml
        patch.yaml
      production/
        kustomization.yaml
        patch.yaml
```

## Basic Compute Resource Quota

Define a quota that limits CPU and memory usage within a namespace.

```yaml
# infrastructure/resource-quotas/base/compute-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  # Namespace will be set by Kustomization
spec:
  hard:
    # Total CPU requests across all pods
    requests.cpu: "4"
    # Total CPU limits across all pods
    limits.cpu: "8"
    # Total memory requests across all pods
    requests.memory: 8Gi
    # Total memory limits across all pods
    limits.memory: 16Gi
    # Maximum number of pods
    pods: "20"
```

## Object Count Quota

Limit the number of Kubernetes objects in a namespace.

```yaml
# infrastructure/resource-quotas/base/object-count-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: object-count-quota
spec:
  hard:
    # Limit total number of ConfigMaps
    configmaps: "50"
    # Limit total number of Secrets
    secrets: "50"
    # Limit total number of Services
    services: "10"
    # Limit LoadBalancer services (these are expensive)
    services.loadbalancers: "2"
    # Limit NodePort services
    services.nodeports: "5"
    # Limit total PersistentVolumeClaims
    persistentvolumeclaims: "10"
```

## Storage Resource Quota

Control storage consumption per namespace.

```yaml
# infrastructure/resource-quotas/base/storage-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
spec:
  hard:
    # Total storage requests across all PVCs
    requests.storage: 100Gi
    # Limit PVCs using the standard storage class
    standard.storageclass.storage.k8s.io/requests.storage: 50Gi
    # Limit PVCs using the fast (SSD) storage class
    fast.storageclass.storage.k8s.io/requests.storage: 50Gi
    # Limit number of PVCs per storage class
    standard.storageclass.storage.k8s.io/persistentvolumeclaims: "5"
    fast.storageclass.storage.k8s.io/persistentvolumeclaims: "3"
```

## Base Kustomization

Combine all quota definitions in a base kustomization.

```yaml
# infrastructure/resource-quotas/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - compute-quota.yaml
  - object-count-quota.yaml
  - storage-quota.yaml
```

## Environment-Specific Overrides

Create patches for different environments. Development gets smaller quotas, production gets larger ones.

```yaml
# infrastructure/resource-quotas/overlays/development/patch.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
spec:
  hard:
    # Development gets minimal resources
    requests.cpu: "2"
    limits.cpu: "4"
    requests.memory: 4Gi
    limits.memory: 8Gi
    pods: "10"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
spec:
  hard:
    # Limited storage in development
    requests.storage: 20Gi
```

```yaml
# infrastructure/resource-quotas/overlays/development/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - path: patch.yaml
```

```yaml
# infrastructure/resource-quotas/overlays/production/patch.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
spec:
  hard:
    # Production gets generous resources
    requests.cpu: "32"
    limits.cpu: "64"
    requests.memory: 64Gi
    limits.memory: 128Gi
    pods: "100"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: object-count-quota
spec:
  hard:
    # Production allows more objects
    configmaps: "200"
    secrets: "200"
    services: "50"
    services.loadbalancers: "10"
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
spec:
  hard:
    requests.storage: 500Gi
```

## Flux Kustomization for Multi-Namespace Deployment

Deploy quotas to multiple team namespaces using Flux Kustomizations.

```yaml
# clusters/my-cluster/resource-quotas/team-alpha.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: quota-team-alpha
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/resource-quotas/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Apply quotas to team-alpha namespace
  targetNamespace: team-alpha
  # Wait for namespace to exist
  dependsOn:
    - name: namespaces
```

```yaml
# clusters/my-cluster/resource-quotas/team-beta.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: quota-team-beta
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/resource-quotas/overlays/development
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: team-beta
  dependsOn:
    - name: namespaces
```

## Scoped Quotas with Priority Classes

Apply different quotas based on pod priority classes.

```yaml
# infrastructure/resource-quotas/priority-quotas.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: high-priority-quota
spec:
  hard:
    # Limit high-priority pods
    pods: "10"
    requests.cpu: "8"
    requests.memory: 16Gi
  # Only applies to pods with high priority
  scopeSelector:
    matchExpressions:
      - scopeName: PriorityClass
        operator: In
        values:
          - high-priority
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: low-priority-quota
spec:
  hard:
    # More pods allowed at low priority
    pods: "50"
    requests.cpu: "4"
    requests.memory: 8Gi
  scopeSelector:
    matchExpressions:
      - scopeName: PriorityClass
        operator: In
        values:
          - low-priority
```

## Quota with BestEffort Scope

Limit BestEffort pods separately from pods with defined resource requests.

```yaml
# infrastructure/resource-quotas/besteffort-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: besteffort-quota
spec:
  hard:
    # Strictly limit BestEffort pods (no resource requests/limits)
    pods: "5"
  scopes:
    - BestEffort
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: not-besteffort-quota
spec:
  hard:
    # Allow more pods that have defined resources
    pods: "50"
    requests.cpu: "16"
    limits.cpu: "32"
  scopes:
    - NotBestEffort
```

## Monitoring Quota Usage

Deploy a ConfigMap with a script to check quota usage across namespaces.

```yaml
# infrastructure/resource-quotas/quota-exporter.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: quota-check-script
  namespace: monitoring
data:
  check-quotas.sh: |
    #!/bin/bash
    # List quota usage for all namespaces
    for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
      quotas=$(kubectl get resourcequota -n "$ns" --no-headers 2>/dev/null)
      if [ -n "$quotas" ]; then
        echo "=== Namespace: $ns ==="
        kubectl describe resourcequota -n "$ns"
        echo ""
      fi
    done
```

## Flux Notification on Quota Changes

Get notified when quota configurations are updated.

```yaml
# clusters/my-cluster/notifications/quota-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: quota-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSources:
    - kind: Kustomization
      name: quota-team-*
      namespace: flux-system
  eventSeverity: info
```

## Verifying Quotas

After Flux reconciles the configuration, verify quotas are applied correctly.

```bash
# Check Flux reconciliation status
flux get kustomizations | grep quota

# List quotas in a namespace
kubectl get resourcequota -n team-alpha

# Describe quota to see usage vs. limits
kubectl describe resourcequota compute-quota -n team-alpha

# Test quota enforcement by creating a pod that exceeds limits
kubectl run test-pod --image=nginx --namespace=team-alpha \
  --requests='cpu=100,memory=999Gi' --dry-run=server
```

## Troubleshooting

Common issues when working with Resource Quotas:

- **Pod creation rejected**: Check if the namespace has exceeded its quota with `kubectl describe resourcequota -n <namespace>`
- **Missing resource requests**: When a compute quota exists, all pods must specify resource requests and limits. Use LimitRanges to set defaults.
- **Flux not applying changes**: Verify the Kustomization path is correct and the source is accessible with `flux get sources git`

## Conclusion

Managing Resource Quotas through Flux CD provides a consistent, auditable approach to resource governance. By storing quota definitions in Git and using Kustomize overlays for environment-specific values, you ensure that resource limits are consistently applied across all namespaces and clusters. This approach is especially valuable in multi-tenant environments where fair resource distribution is critical.

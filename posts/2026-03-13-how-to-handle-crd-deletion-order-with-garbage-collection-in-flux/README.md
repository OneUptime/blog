# How to Handle CRD Deletion Order with Garbage Collection in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, CRD, Garbage Collection, Pruning, Custom Resource Definitions

Description: Learn how to manage CRD deletion order when Flux garbage collection removes custom resources and their definitions.

---

## Introduction

Custom Resource Definitions (CRDs) and their corresponding custom resources have a dependency relationship in Kubernetes. Custom resources cannot exist without their CRD, and deleting a CRD automatically deletes all custom resources of that type. When Flux garbage collection (pruning) removes resources from the cluster because they were removed from Git, the order of deletion matters.

If Flux deletes a CRD before deleting its custom resources, Kubernetes handles the cascading deletion. However, this can cause issues with finalizers, controllers that need to perform cleanup, and resources that depend on the custom resources. Conversely, if custom resources are deleted first but the controller that handles them is already gone, finalizers may never be resolved.

This guide covers strategies for handling CRD deletion order with Flux garbage collection to avoid stuck resources and incomplete cleanup.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster with Flux CD installed (v2.0 or later)
- CRDs and custom resources managed through Flux Kustomizations
- kubectl access to the cluster
- Understanding of Flux pruning and garbage collection behavior

## Understanding the Deletion Order Problem

Consider a typical operator deployment that includes CRDs, the operator deployment, and custom resources. When you remove all of these from Git, Flux garbage collection will delete them in an order that may not respect the dependency chain.

If the CRD is deleted first, Kubernetes cascading deletion removes all custom resources immediately, bypassing any finalizer logic the operator controller would have executed. If the operator deployment is deleted first, finalizers on custom resources cannot be resolved because the controller is no longer running.

## Strategy 1: Separate Kustomizations with Dependencies

The most reliable approach is to split CRDs, the operator, and custom resources into separate Kustomizations with explicit dependencies:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager-crds
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: infrastructure
  path: ./infrastructure/cert-manager/crds
  prune: true
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: infrastructure
  path: ./infrastructure/cert-manager/controller
  prune: true
  dependsOn:
    - name: cert-manager-crds
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager-resources
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: infrastructure
  path: ./infrastructure/cert-manager/resources
  prune: true
  dependsOn:
    - name: cert-manager
```

When you remove these Kustomizations, Flux respects the dependency order in reverse. The custom resources Kustomization is deleted first, then the controller, then the CRDs. This gives the controller time to process finalizers before being removed.

## Strategy 2: Excluding CRDs from Garbage Collection

If you want to manage CRDs separately from the garbage collection lifecycle, you can exclude them from pruning using an annotation:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: certificates.cert-manager.io
  annotations:
    kustomize.toolkit.fluxcd.io/prune: disabled
```

With this annotation, Flux will not delete the CRD during garbage collection, even if it is removed from Git. You would need to delete the CRD manually when you are certain all custom resources have been cleaned up.

## Strategy 3: Disabling Pruning on CRD Kustomization

An alternative to per-resource annotations is disabling pruning entirely on the CRD Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: operator-crds
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: infrastructure
  path: ./infrastructure/operator/crds
  prune: false
```

Setting `prune: false` means Flux will create and update CRDs but never delete them. This is a common pattern for CRDs because they typically persist across operator upgrades.

## Handling Finalizers During Deletion

When custom resources have finalizers, the controller must be running to resolve them. Structure your deletion process to ensure the controller remains active:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: custom-resources
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./custom-resources
  prune: true
  dependsOn:
    - name: operator-controller
  wait: true
  timeout: 5m
```

The `wait: true` setting ensures Flux waits for the deletion of custom resources to complete (including finalizer resolution) before proceeding. The `timeout` prevents infinite waits if a finalizer cannot be resolved.

## Practical Example: Prometheus Operator

Here is a real-world example with the Prometheus Operator, which has CRDs, a controller, and custom resources:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: prometheus-crds
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: infrastructure
  path: ./infrastructure/monitoring/crds
  prune: false
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: prometheus-operator
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: infrastructure
  path: ./infrastructure/monitoring/operator
  prune: true
  dependsOn:
    - name: prometheus-crds
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: monitoring-config
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: infrastructure
  path: ./infrastructure/monitoring/config
  prune: true
  dependsOn:
    - name: prometheus-operator
```

Note that `prometheus-crds` has `prune: false` entirely, meaning CRDs are never automatically deleted. The monitoring config (ServiceMonitors, PrometheusRules) depends on the operator, which depends on the CRDs.

## Using Health Checks to Ensure Controller Readiness

You can use health checks to verify that the operator controller is fully running before Flux manages custom resources:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: operator-controller
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: infrastructure
  path: ./infrastructure/operator/controller
  prune: true
  dependsOn:
    - name: operator-crds
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: operator-controller
      namespace: operator-system
```

The health check ensures the controller deployment is fully running before Flux considers the Kustomization ready. This means if the custom resources Kustomization depends on this one, the controller will be available to handle finalizers during deletion.

## Troubleshooting Stuck Deletions

If resources get stuck during deletion, check for unresolved finalizers:

```bash
kubectl get crd certificates.cert-manager.io -o jsonpath='{.metadata.finalizers}'
kubectl get certificates -A -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.finalizers}{"\n"}{end}'
```

If the controller is gone and finalizers cannot be resolved, you may need to manually remove the finalizers:

```bash
kubectl patch certificate my-cert -n default --type=json -p='[{"op": "remove", "path": "/metadata/finalizers"}]'
```

## Conclusion

Managing CRD deletion order with Flux garbage collection requires deliberate structuring of your Kustomizations. The most effective approach is separating CRDs, controllers, and custom resources into individual Kustomizations with dependency chains that enforce correct deletion order. For CRDs that should never be automatically deleted, disable pruning with annotations or by setting `prune: false`. Always ensure operator controllers remain running long enough to resolve finalizers on custom resources before being removed.

# How to Use Annotations to Prevent Pruning in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, fluxcd, gitops, annotations, pruning, garbage-collection, kubernetes

Description: Learn how to use Kubernetes annotations to prevent Flux from deleting specific resources during garbage collection pruning.

---

## Introduction

Flux CD garbage collection automatically removes Kubernetes resources from your cluster when they are deleted from your Git repository. While this keeps your cluster aligned with source control, some resources must be preserved regardless of their presence in Git. Annotations provide the most direct and officially supported method to prevent Flux from pruning individual resources.

The `kustomize.toolkit.fluxcd.io/prune` annotation is the primary mechanism Flux uses to determine whether a resource should be included in garbage collection. This post covers how to use this annotation effectively, along with practical patterns for applying it across your infrastructure.

## Prerequisites

- A Kubernetes cluster with Flux CD v2.x installed
- A Kustomization resource with `prune: true` enabled
- `kubectl` and `flux` CLI tools installed
- Basic familiarity with Kubernetes annotations

## The Prune Annotation

Flux respects a single annotation to control pruning behavior on individual resources:

```
kustomize.toolkit.fluxcd.io/prune: disabled
```

When this annotation is present on a resource, Flux will skip it during the garbage collection phase. The resource will still be applied and updated by Flux when changes are made in Git, but it will not be deleted when removed from Git.

## Applying the Annotation Directly

The simplest approach is to add the annotation directly to your resource manifests:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  annotations:
    kustomize.toolkit.fluxcd.io/prune: disabled
```

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: grafana-data
  namespace: monitoring
  annotations:
    kustomize.toolkit.fluxcd.io/prune: disabled
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: fast-ssd
```

Both resources above will persist in the cluster even if their manifests are removed from the Git repository.

## Applying Annotations via Kustomize Patches

When you need to protect multiple resources, Kustomize patches provide a more scalable approach than annotating each manifest individually:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
  - pvc.yaml
  - configmap.yaml
patches:
  - target:
      kind: PersistentVolumeClaim
    patch: |
      apiVersion: v1
      kind: PersistentVolumeClaim
      metadata:
        name: not-used
        annotations:
          kustomize.toolkit.fluxcd.io/prune: disabled
  - target:
      kind: Namespace
    patch: |
      apiVersion: v1
      kind: Namespace
      metadata:
        name: not-used
        annotations:
          kustomize.toolkit.fluxcd.io/prune: disabled
```

This configuration applies the prune-disabled annotation to all PersistentVolumeClaims and Namespaces referenced in the Kustomization, regardless of how many there are.

## Applying Annotations to Cluster Resources at Runtime

If you need to protect a resource that is already running in the cluster and you cannot update the Git manifest in time, you can apply the annotation directly:

```bash
kubectl annotate namespace monitoring kustomize.toolkit.fluxcd.io/prune=disabled
```

```bash
kubectl annotate pvc grafana-data -n monitoring kustomize.toolkit.fluxcd.io/prune=disabled
```

This provides immediate protection. However, keep in mind that Flux may overwrite annotations on the next reconciliation if the resource still exists in Git without the annotation. To make the protection permanent, also update the manifest in Git.

## Protecting Entire Resource Types with Patches

You can use Kustomize patches to protect all resources of a given type across your entire Kustomization:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - all-resources.yaml
patches:
  - target:
      kind: Secret
    patch: |
      apiVersion: v1
      kind: Secret
      metadata:
        name: not-used
        annotations:
          kustomize.toolkit.fluxcd.io/prune: disabled
  - target:
      kind: ConfigMap
    patch: |
      apiVersion: v1
      kind: ConfigMap
      metadata:
        name: not-used
        annotations:
          kustomize.toolkit.fluxcd.io/prune: disabled
  - target:
      kind: PersistentVolumeClaim
    patch: |
      apiVersion: v1
      kind: PersistentVolumeClaim
      metadata:
        name: not-used
        annotations:
          kustomize.toolkit.fluxcd.io/prune: disabled
```

This pattern is useful when you want to protect all Secrets, ConfigMaps, and PVCs from being pruned, while allowing Deployments, Services, and other operational resources to be garbage collected normally.

## Selective Protection with Name Patterns

You can target specific resources by name using the patch target:

```yaml
patches:
  - target:
      kind: ConfigMap
      name: "shared-.*"
    patch: |
      apiVersion: v1
      kind: ConfigMap
      metadata:
        name: not-used
        annotations:
          kustomize.toolkit.fluxcd.io/prune: disabled
```

This protects only ConfigMaps whose names start with `shared-`, while allowing other ConfigMaps to be pruned normally.

## Complete Example

Here is a complete working example that deploys an application with selective prune protection:

```yaml
# flux-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-stack
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: production
```

```yaml
# apps/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
  - pvc.yaml
patches:
  - target:
      kind: Namespace
    patch: |
      apiVersion: v1
      kind: Namespace
      metadata:
        name: not-used
        annotations:
          kustomize.toolkit.fluxcd.io/prune: disabled
  - target:
      kind: PersistentVolumeClaim
    patch: |
      apiVersion: v1
      kind: PersistentVolumeClaim
      metadata:
        name: not-used
        annotations:
          kustomize.toolkit.fluxcd.io/prune: disabled
```

With this setup, the Namespace and PVC are protected from pruning, while the Deployment and Service will be cleaned up if removed from Git.

## Verifying Annotations

Confirm that annotations are correctly applied after reconciliation:

```bash
kubectl get namespace monitoring -o jsonpath='{.metadata.annotations}' | jq .
```

```bash
kubectl get pvc grafana-data -n monitoring -o jsonpath='{.metadata.annotations}' | jq .
```

Both should include the `kustomize.toolkit.fluxcd.io/prune: disabled` annotation.

## Conclusion

Annotations are the primary and most reliable way to prevent Flux from pruning resources during garbage collection. The `kustomize.toolkit.fluxcd.io/prune: disabled` annotation can be applied directly to manifests, via Kustomize patches for bulk operations, or at runtime using kubectl for emergency protection. By strategically annotating resources that hold persistent data or shared state, you maintain the benefits of automatic garbage collection while safeguarding critical infrastructure components.

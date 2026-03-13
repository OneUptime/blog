# How to Exclude Resources from Garbage Collection in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, fluxcd, GitOps, Garbage-Collection, Pruning, Kustomization, Kubernetes

Description: Learn how to exclude specific resources from Flux garbage collection to prevent accidental deletion of critical cluster resources.

---

## Introduction

Flux garbage collection is a powerful feature that keeps your cluster in sync with your Git repository by automatically deleting resources that are no longer defined in source control. However, there are scenarios where you want certain resources to persist even after they are removed from Git. For example, PersistentVolumeClaims containing important data, Namespaces with resources managed by other controllers, or ConfigMaps shared across multiple applications should often be excluded from pruning.

Flux provides several mechanisms to exclude resources from garbage collection, giving you fine-grained control over what gets pruned and what remains untouched.

## Prerequisites

- A Kubernetes cluster with Flux CD v2.x installed
- `kubectl` configured to access your cluster
- A Kustomization with `prune: true` enabled
- Basic understanding of Kubernetes labels and annotations

## Using the Disable Pruning Annotation

The most direct way to exclude a resource from garbage collection is to add the `kustomize.toolkit.fluxcd.io/prune: disabled` annotation to the resource. When Flux encounters this annotation, it skips the resource during the pruning phase, even if the resource is no longer present in the Git repository.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-storage
  namespace: production
  annotations:
    kustomize.toolkit.fluxcd.io/prune: disabled
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  storageClassName: standard
```

With this annotation, if you remove the PVC manifest from Git, Flux will not delete the PersistentVolumeClaim from the cluster. The resource remains intact, preserving your data.

## Excluding Namespaces

Namespaces are a common candidate for exclusion from garbage collection. Deleting a Namespace cascades to all resources within it, which can be catastrophic if other controllers or teams manage resources in that namespace.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: shared-services
  annotations:
    kustomize.toolkit.fluxcd.io/prune: disabled
  labels:
    app.kubernetes.io/managed-by: flux
```

By annotating the Namespace, you ensure it survives even if its definition is removed from the Git repository.

## Excluding Multiple Resources with Patches

If you need to exclude many resources at once, you can use Kustomize patches to apply the annotation to multiple resources without modifying each individual manifest:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
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

This approach applies the prune-disabled annotation to all PersistentVolumeClaims and Namespaces matched by the target selector without modifying the original manifest files.

## Excluding Resources by Label Selector

You can also exclude entire categories of resources by labeling them and using Kustomize patches with label selectors:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - statefulset.yaml
  - pvc.yaml
patches:
  - target:
      labelSelector: "data-persistence=critical"
    patch: |
      apiVersion: v1
      kind: __any__
      metadata:
        name: not-used
        annotations:
          kustomize.toolkit.fluxcd.io/prune: disabled
```

Then label any resource you want to protect:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-data
  namespace: cache
  labels:
    data-persistence: critical
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

## Practical Example: Protecting Stateful Workloads

Here is a complete example that deploys a stateful application while protecting its storage from garbage collection:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
        annotations:
          kustomize.toolkit.fluxcd.io/prune: disabled
      spec:
        accessModes:
          - ReadWriteOnce
        resources:
          requests:
            storage: 100Gi
```

In this example, the volumeClaimTemplates include the prune-disabled annotation. If the StatefulSet is ever removed from Git, the PVCs created by the StatefulSet will not be pruned by Flux.

## Verifying Exclusion

To verify that a resource is excluded from garbage collection, check the Kustomization status after a reconciliation:

```bash
flux reconcile kustomization my-app
kubectl get kustomization my-app -n flux-system -o yaml
```

Resources with the prune-disabled annotation will still appear in the inventory but will be skipped during the pruning phase. You can also check the Flux logs for messages about skipped resources:

```bash
kubectl logs -n flux-system deployment/kustomize-controller | grep -i prune
```

## Important Considerations

Resources excluded from garbage collection remain in the cluster indefinitely until manually deleted. Make sure you have a process for eventually cleaning up excluded resources that are no longer needed.

The prune-disabled annotation must be present on the resource in the cluster, not just in Git. If a resource was already applied without the annotation, you need to first update it with the annotation before removing it from Git.

When using volumeClaimTemplates in StatefulSets, the annotation on the template applies to newly created PVCs but may not retroactively apply to existing ones. You may need to manually add the annotation to existing PVCs.

## Conclusion

Excluding resources from Flux garbage collection is essential for protecting stateful data, shared resources, and infrastructure components that must persist independently of your Git repository. The `kustomize.toolkit.fluxcd.io/prune: disabled` annotation provides a simple and effective mechanism for this purpose. Use it strategically on resources like PersistentVolumeClaims, Namespaces, and shared ConfigMaps to prevent accidental data loss while still benefiting from automatic cleanup of transient resources.

# How to Understand Flux Garbage Collection Order

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, fluxcd, gitops, garbage-collection, pruning, kubernetes, resource-ordering

Description: Learn how Flux determines the order of resource deletion during garbage collection and how to manage deletion dependencies.

---

## Introduction

When Flux garbage collection removes resources from a cluster, the order in which resources are deleted matters significantly. Deleting a Namespace before its contents, removing a CRD before its custom resources, or deleting a Service before its backing Deployment can cause cascading failures, stuck finalizers, and resources that cannot be properly cleaned up.

Understanding how Flux orders garbage collection helps you design your manifests and Kustomizations to avoid these pitfalls. This post explains the deletion order Flux follows, how it handles dependencies, and what you can do to influence the process.

## Prerequisites

- A Kubernetes cluster with Flux CD v2.x installed
- A Kustomization with `prune: true` enabled
- `kubectl` and `flux` CLI tools installed
- Understanding of Kubernetes resource dependencies

## Default Garbage Collection Order

Flux deletes resources in reverse order of their apply order. During application, Flux follows a specific ordering based on resource kinds, applying foundational resources first and dependent resources later. During garbage collection, this order is reversed so that dependent resources are deleted before the resources they depend on.

The default apply order in Flux follows this general sequence:

1. Namespaces
2. Custom Resource Definitions (CRDs)
3. Service Accounts
4. Cluster Roles and Bindings
5. Roles and Role Bindings
6. ConfigMaps and Secrets
7. Services
8. Deployments, StatefulSets, DaemonSets
9. Custom Resources

During garbage collection, this order is reversed. Custom resources are deleted first, then Deployments, then Services, and so on, with Namespaces being the last to go. This ensures that dependent resources are cleaned up before the resources they depend on.

## Why Order Matters

Consider a scenario where you have a CRD and custom resources based on that CRD:

```yaml
# crd.yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: monitors.monitoring.example.com
spec:
  group: monitoring.example.com
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                endpoint:
                  type: string
                interval:
                  type: string
  scope: Namespaced
  names:
    plural: monitors
    singular: monitor
    kind: Monitor
```

```yaml
# monitor.yaml
apiVersion: monitoring.example.com/v1
kind: Monitor
metadata:
  name: api-health
  namespace: default
spec:
  endpoint: https://api.example.com/health
  interval: 30s
```

If both files are removed from Git, Flux must delete the Monitor custom resource before deleting the CRD. If the CRD is deleted first, the Monitor resource becomes an orphan that Kubernetes cannot properly manage.

## Observing the Deletion Order

You can observe the deletion order by watching events during a garbage collection cycle. First, force a reconciliation after removing resources from Git:

```bash
flux reconcile kustomization my-app
```

Then watch the events:

```bash
kubectl events -n flux-system --for kustomization/my-app --watch
```

You can also check the kustomize-controller logs for detailed deletion ordering:

```bash
kubectl logs -n flux-system deployment/kustomize-controller --follow | grep -i "delete\|prune\|garbage"
```

## Resource Dependencies and Ordering

Flux uses the resource kind to determine ordering. The built-in ordering ensures that cluster-scoped resources are generally handled after namespaced resources during deletion. Here is how different resource categories are treated during garbage collection:

Deleted first (highest priority during GC):
- Custom Resources (instances of CRDs)
- Jobs, CronJobs
- Deployments, StatefulSets, DaemonSets
- Services, Ingresses

Deleted in the middle:
- ConfigMaps, Secrets
- PersistentVolumeClaims
- ServiceAccounts
- Roles, RoleBindings

Deleted last (lowest priority during GC):
- ClusterRoles, ClusterRoleBindings
- Custom Resource Definitions
- Namespaces

## Handling Cross-Kustomization Dependencies

When resources span multiple Kustomizations, the deletion order depends on which Kustomization is deleted and its `dependsOn` configuration:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-crds
  namespace: flux-system
spec:
  interval: 10m
  path: ./crds
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-resources
  namespace: flux-system
spec:
  interval: 10m
  path: ./resources
  prune: true
  dependsOn:
    - name: app-crds
  sourceRef:
    kind: GitRepository
    name: flux-system
```

With `dependsOn`, Flux ensures that `app-resources` is applied after `app-crds`. During deletion, if both are removed, Flux processes the dependent Kustomization first, deleting the custom resources before the CRDs.

## Influencing Deletion Order with Multiple Kustomizations

You can explicitly control deletion order by splitting resources into separate Kustomizations with dependency chains:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: middleware
  namespace: flux-system
spec:
  interval: 10m
  path: ./middleware
  prune: true
  dependsOn:
    - name: infrastructure
  sourceRef:
    kind: GitRepository
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: applications
  namespace: flux-system
spec:
  interval: 10m
  path: ./applications
  prune: true
  dependsOn:
    - name: middleware
  sourceRef:
    kind: GitRepository
    name: flux-system
```

This three-tier structure ensures that applications are cleaned up before middleware, and middleware before infrastructure.

## Dealing with Stuck Deletions

If garbage collection gets stuck, it is usually because a resource has a finalizer that cannot be processed. Check for stuck resources:

```bash
kubectl get all --all-namespaces -l kustomize.toolkit.fluxcd.io/name=my-app | grep Terminating
```

For stuck resources, investigate the finalizer:

```bash
kubectl get deployment stuck-app -n default -o jsonpath='{.metadata.finalizers}'
```

If the finalizer controller is no longer running, you may need to remove the finalizer manually:

```bash
kubectl patch deployment stuck-app -n default \
  --type json \
  -p '[{"op": "remove", "path": "/metadata/finalizers"}]'
```

## Conclusion

Flux garbage collection follows a well-defined deletion order that reverses the apply order, ensuring dependent resources are removed before their dependencies. By understanding this ordering and using Kustomization dependencies, you can design your GitOps structure to handle resource deletion gracefully. When dealing with CRDs and custom resources, always separate them into dependent Kustomizations to guarantee correct deletion sequencing.

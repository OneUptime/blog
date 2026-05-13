# How to Understand Flux Garbage Collection Order

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, GitOps, Garbage-Collection, Pruning, Kubernetes, Resource-Ordering

Description: Learn how Flux determines the order of resource deletion during garbage collection and how to manage deletion dependencies.

---

## Introduction

When Flux garbage collection removes resources from a cluster, the order in which resources are deleted matters significantly. Deleting a Namespace before its contents, removing a CRD before its custom resources, or removing controllers before the resources they finalize can cause stuck finalizers and resources that cannot be properly cleaned up.

Understanding how Flux orders garbage collection helps you design your manifests and Kustomizations to avoid these pitfalls. This post explains the deletion order Flux follows, how it handles dependencies, and what you can do to influence the process.

## Prerequisites

- A Kubernetes cluster with Flux CD v2.x installed
- A Kustomization with `prune: true` enabled
- `kubectl` and `flux` CLI tools installed
- Understanding of Kubernetes resource dependencies

## Default Garbage Collection Order

Flux deletes resources in reverse order of its reconcile order. During application, Flux follows a specific ordering based on resource kinds, applying foundational resources first and some admission webhooks last. During garbage collection, this order is reversed so that most dependent resources are deleted before the resources they depend on.

The default apply order in Flux follows this general sequence:

1. Custom Resource Definitions (CRDs)
2. Namespaces
3. ClusterRoles and other cluster-level classes such as RuntimeClass, PriorityClass, StorageClass, VolumeSnapshotClass, IngressClass, and GatewayClass
4. ClusterRoleBindings
5. ResourceQuotas
6. ServiceAccounts
7. Roles and RoleBindings
8. ConfigMaps and Secrets
9. Services and LimitRanges
10. Deployments, StatefulSets, CronJobs, and PodDisruptionBudgets
11. Other kinds, including most custom resources, sorted deterministically by group and kind
12. MutatingWebhookConfigurations and ValidatingWebhookConfigurations

During garbage collection, this order is reversed. Webhook configurations are deleted first, then other unlisted kinds such as most custom resources, then workloads and supporting resources, with Namespaces and CRDs deleted near the end. This helps dependent resources get cleaned up before the resources they depend on.

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

If both files are removed from Git, Flux should delete the Monitor custom resource before deleting the CRD. If the CRD deletion starts while custom resources still exist, Kubernetes removes the API endpoint for that type and finalizers on the custom resources can block the CRD from terminating cleanly.

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

Resource Dependencies and Ordering

Flux uses the resource kind to determine ordering. The built-in ordering ensures that foundational resources such as CRDs and Namespaces are generally handled near the end during deletion. Here is how different resource categories are treated during garbage collection:

Deleted first (highest priority during GC):
- ValidatingWebhookConfigurations and MutatingWebhookConfigurations
- Other kinds not explicitly listed in Flux's built-in order, including most custom resources, sorted deterministically by group and kind
- PodDisruptionBudgets, CronJobs, StatefulSets, and Deployments

Deleted in the middle:
- LimitRanges and Services
- ConfigMaps, Secrets
- Roles, RoleBindings
- ServiceAccounts
- ResourceQuotas

Deleted last (lowest priority during GC):
- ClusterRoles, ClusterRoleBindings
- Namespaces
- Custom Resource Definitions

## Handling Cross-Kustomization Dependencies

When resources span multiple Kustomizations, `dependsOn` controls apply-time readiness between those Kustomizations:

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

With `dependsOn`, Flux ensures that `app-resources` is applied after `app-crds` by waiting for `app-crds` to become ready. It does not, by itself, guarantee a reverse dependency order if both Kustomization objects are deleted at the same time. To make deletion predictable, remove or suspend the dependent Kustomization first and let it prune before removing the Kustomization that owns the CRDs.

## Influencing Deletion Order with Multiple Kustomizations

You can make deletion order easier to control by splitting resources into separate Kustomizations with dependency chains:

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

This three-tier structure ensures that applications are applied after middleware, and middleware after infrastructure. For cleanup, remove or delete resources tier by tier in the reverse order so that applications are cleaned up before middleware, and middleware before infrastructure.

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

Flux garbage collection follows a well-defined deletion order that reverses the reconcile order, helping dependent resources be removed before their dependencies. By understanding this ordering and using Kustomization dependencies during apply, you can design your GitOps structure to handle resource deletion gracefully. When dealing with CRDs and custom resources, separate them into dependent Kustomizations and clean them up in reverse tier order when you need deterministic deletion sequencing.

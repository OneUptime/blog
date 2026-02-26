# How to Use the 'PrunePropagationPolicy' Sync Option in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Sync Options, Resource Management

Description: Learn how to use the PrunePropagationPolicy sync option in ArgoCD to control how Kubernetes deletes resources and their dependents during pruning.

---

When ArgoCD prunes resources - removing Kubernetes objects that no longer exist in your Git repository - it needs to decide how to handle dependent resources. Should deleting a Deployment also delete its ReplicaSets and Pods immediately? Should it wait for graceful termination? Or should it orphan the dependents entirely?

The `PrunePropagationPolicy` sync option gives you control over this behavior by setting the Kubernetes delete propagation policy that ArgoCD uses during pruning.

## Understanding Kubernetes Delete Propagation

Before diving into ArgoCD configuration, you need to understand how Kubernetes handles cascading deletes. When you delete a resource that owns other resources (like a Deployment owning ReplicaSets), Kubernetes supports three propagation policies:

**Foreground**: Kubernetes marks the owner resource for deletion but keeps it alive until all dependents are deleted first. The owner resource gets a `deletionTimestamp` and a `foregroundDeletion` finalizer. Only after all dependents are gone does the owner actually get removed.

**Background**: Kubernetes deletes the owner resource immediately and then garbage collects the dependents in the background. This is the default Kubernetes behavior and the fastest option.

**Orphan**: Kubernetes deletes the owner resource but leaves all dependents running. The dependents lose their `ownerReference` and become standalone resources.

## Default ArgoCD Behavior

By default, ArgoCD uses the `foreground` propagation policy when pruning resources. This means when a resource is removed from Git and ArgoCD prunes it, Kubernetes waits for all dependent resources to be deleted before completing the deletion of the parent resource.

This is the safest default, but it can be slow for resources with many dependents.

## Setting the PrunePropagationPolicy

You can configure this option in your Application manifest:

```yaml
# Application with background prune propagation
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-app.git
    targetRevision: main
    path: manifests/
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  syncPolicy:
    automated:
      prune: true
    syncOptions:
      - PrunePropagationPolicy=background
```

The valid values are `foreground`, `background`, and `orphan`.

## Using Background Propagation

Background propagation is useful when you want syncs to complete faster and you do not need to wait for dependent resources to be cleaned up:

```yaml
syncOptions:
  - PrunePropagationPolicy=background
```

With this setting, when ArgoCD prunes a Deployment, the Deployment object is removed immediately from the Kubernetes API. The associated ReplicaSets and Pods are then garbage collected by Kubernetes in the background.

This is particularly helpful when:
- You have large applications where pruning takes a long time with foreground propagation
- You are running frequent syncs and need them to complete quickly
- The dependent resources (like Pods) have long graceful shutdown periods

## Using Foreground Propagation

Foreground propagation is the default and the most predictable option:

```yaml
syncOptions:
  - PrunePropagationPolicy=foreground
```

With foreground propagation, ArgoCD waits for all dependents to be deleted before the parent resource is considered deleted. This gives you a clear picture of when the pruning is truly complete.

Use foreground when:
- You need to know exactly when all resources from a removed component are gone
- You have post-prune operations that depend on resources being fully cleaned up
- You want sync operations to reflect the true state of cleanup

## Using Orphan Propagation

Orphan propagation is a specialized option for situations where you want to remove the parent resource but keep its dependents running:

```yaml
syncOptions:
  - PrunePropagationPolicy=orphan
```

This is useful in specific scenarios:

**Migration between resource types.** If you are migrating from a Deployment to a StatefulSet, you might want to delete the Deployment but keep the Pods running while the new StatefulSet takes over.

**Transitioning ownership.** When moving a resource from one ArgoCD application to another, orphaning prevents the dependents from being deleted during the transition.

**Emergency situations.** If you need to remove a resource definition from Git but cannot afford any downtime from Pod restarts.

## Setting via CLI

You can also set the propagation policy during a manual sync:

```bash
# Sync with background propagation
argocd app sync my-app --sync-option PrunePropagationPolicy=background

# Sync with orphan propagation
argocd app sync my-app --sync-option PrunePropagationPolicy=orphan
```

This is useful for one-off operations where you want different behavior from the default.

## Practical Example: Cleaning Up a Microservice

Imagine you have a microservices application and you need to remove one of the services. Here is what happens with each policy:

```yaml
# Before: manifests include order-service, payment-service, and notification-service
# After: you remove notification-service from Git

# With foreground (default):
# 1. ArgoCD marks the notification-service Deployment for deletion
# 2. Kubernetes deletes all Pods owned by the Deployment's ReplicaSet
# 3. Kubernetes deletes the ReplicaSet
# 4. Kubernetes deletes the Deployment
# 5. ArgoCD reports sync complete
# Total time: could be 30+ seconds depending on graceful shutdown

# With background:
# 1. ArgoCD deletes the notification-service Deployment
# 2. ArgoCD reports sync complete immediately
# 3. Kubernetes cleans up ReplicaSets and Pods in background
# Total time: near-instant from ArgoCD's perspective

# With orphan:
# 1. ArgoCD deletes the notification-service Deployment
# 2. ReplicaSet and Pods continue running without an owner
# 3. They remain running until manually cleaned up
```

## Combining with Other Sync Options

PrunePropagationPolicy works well with other prune-related options:

```yaml
# Full pruning configuration
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: production-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/production.git
    targetRevision: main
    path: k8s/
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - PrunePropagationPolicy=background
      - PruneLast=true
      - ApplyOutOfSyncOnly=true
```

The combination of `PruneLast=true` and `PrunePropagationPolicy=background` is particularly useful. `PruneLast` ensures that pruning happens after all other resources are applied (so new resources are up before old ones are removed), and `background` ensures the pruning itself completes quickly.

## Per-Resource Annotation

You can also set the propagation policy on individual resources using annotations:

```yaml
# Set propagation policy on a specific resource
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-service
  annotations:
    argocd.argoproj.io/sync-options: PrunePropagationPolicy=orphan
spec:
  replicas: 3
  selector:
    matchLabels:
      app: legacy-service
  template:
    metadata:
      labels:
        app: legacy-service
    spec:
      containers:
        - name: legacy
          image: myorg/legacy:1.0
```

This gives you fine-grained control. You might want most resources to use background propagation for speed, but specific critical resources to use foreground or orphan.

## Debugging Prune Issues

If you are having issues with pruning behavior, check the ArgoCD application events:

```bash
# View recent sync operations and prune details
argocd app get my-app --show-operation

# Check Kubernetes events for the namespace
kubectl get events -n production --sort-by='.lastTimestamp' | grep -i delete

# Look at ArgoCD controller logs for prune details
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller | grep -i prune
```

## Common Pitfalls

**Orphaned resources accumulating.** If you use `orphan` propagation, make sure you have a process to clean up the orphaned dependents. Otherwise, they will keep running and consuming resources indefinitely.

**Foreground timeouts.** With foreground propagation and Pods that have long `terminationGracePeriodSeconds`, the prune operation can take a long time. This might cause ArgoCD sync timeouts.

**Background with dependent ordering.** If you remove multiple related resources at once and use background propagation, Kubernetes might delete them in an unexpected order since it processes each deletion independently.

## Summary

The `PrunePropagationPolicy` sync option gives you fine-grained control over how ArgoCD handles cascading deletes during pruning. Choose `foreground` for safety and predictability, `background` for speed, and `orphan` for special migration scenarios. Understanding this option is essential for managing production ArgoCD deployments where prune behavior directly affects application availability.

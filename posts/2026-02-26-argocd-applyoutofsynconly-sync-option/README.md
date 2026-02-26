# How to Use the 'ApplyOutOfSyncOnly' Sync Option in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Sync Options, Deployment

Description: Learn how to use the ApplyOutOfSyncOnly sync option in ArgoCD to only apply resources that are actually out of sync, reducing deployment time and minimizing risk.

---

When you sync an ArgoCD application, the default behavior is to apply every resource in your manifest to the cluster - even resources that are already in their desired state. For small applications, this is fine. But when you are managing hundreds of resources across a large application, re-applying everything on every sync is wasteful, slow, and introduces unnecessary risk.

The `ApplyOutOfSyncOnly` sync option changes this behavior. It tells ArgoCD to only apply resources that are actually out of sync, skipping everything else. This can dramatically speed up your sync operations and reduce the blast radius of any deployment issues.

## Why Default Sync Behavior Can Be Problematic

By default, ArgoCD performs a full apply of all resources during a sync. This means:

- Every Deployment, Service, ConfigMap, and Secret gets re-applied
- Kubernetes processes each apply, even if nothing changed
- For large applications with 100+ resources, this can take several minutes
- If there is a transient API server issue mid-sync, resources that were already fine might get affected

Consider a scenario where you have an application with 200 resources and you only changed a single ConfigMap. Without `ApplyOutOfSyncOnly`, ArgoCD applies all 200 resources. With it, ArgoCD applies only the one ConfigMap that changed.

## How ApplyOutOfSyncOnly Works

When this option is enabled, ArgoCD compares the live state of each resource against the desired state from Git. It then creates a list of resources that differ - the "out of sync" resources. During the sync operation, only those resources get applied.

The comparison happens before the sync starts, so ArgoCD already knows which resources need updating. This is not a new comparison - ArgoCD continuously compares live vs desired state. The option simply uses that existing comparison to filter what gets applied during sync.

## Enabling ApplyOutOfSyncOnly at the Application Level

You can set this option in your Application manifest:

```yaml
# Application with ApplyOutOfSyncOnly enabled
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-large-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-app.git
    targetRevision: main
    path: k8s/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    syncOptions:
      - ApplyOutOfSyncOnly=true
```

That single line - `ApplyOutOfSyncOnly=true` - in the `syncOptions` array is all you need.

## Enabling It via the CLI

If you want to sync an application with this option on a one-time basis without changing the Application manifest:

```bash
# Sync with ApplyOutOfSyncOnly using the CLI
argocd app sync my-large-app --sync-option ApplyOutOfSyncOnly=true
```

This is handy for testing the behavior before committing it to your Application spec.

## Combining with Auto-Sync

ApplyOutOfSyncOnly works well with auto-sync. When auto-sync detects changes in Git, it triggers a sync. With ApplyOutOfSyncOnly enabled, that automatic sync only touches what changed:

```yaml
# Auto-sync with ApplyOutOfSyncOnly for efficient continuous delivery
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: platform-services
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/platform.git
    targetRevision: main
    path: services/
  destination:
    server: https://kubernetes.default.svc
    namespace: platform
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - ApplyOutOfSyncOnly=true
```

This combination is particularly powerful. Self-heal kicks in when someone manually changes a resource, and ApplyOutOfSyncOnly ensures that only the drifted resource gets re-applied rather than everything.

## When to Use ApplyOutOfSyncOnly

This option shines in several scenarios:

**Large applications with many resources.** If your application has dozens or hundreds of Kubernetes resources, applying only what changed saves significant time.

**Applications with resources that have side effects on apply.** Some resources trigger actions when applied, even if nothing changed. For example, applying a Job spec might cause Kubernetes to restart it. ApplyOutOfSyncOnly avoids this.

**High-frequency sync environments.** If you have auto-sync enabled and your team pushes to Git frequently, each sync should be as lean as possible.

**Multi-tenant clusters.** When many teams share a cluster, reducing unnecessary API server load from syncs helps everyone.

## When NOT to Use ApplyOutOfSyncOnly

There are cases where you might want the default full-apply behavior:

**When you need to ensure convergence.** If resources can drift in ways that ArgoCD does not detect (due to custom ignore rules), a full apply ensures everything matches Git.

**When using server-side apply with ownership transfer.** Full applies help ensure field ownership is properly maintained.

**During initial setup.** For the first sync of a new application, all resources are out of sync anyway, so the option has no effect.

## Practical Example: Microservices Application

Here is a realistic example with a microservices application that has many resources:

```yaml
# ApplicationSet generating per-service apps with ApplyOutOfSyncOnly
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: microservices
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/microservices.git
        revision: main
        directories:
          - path: services/*
  template:
    metadata:
      name: '{{path.basename}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/microservices.git
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        syncOptions:
          - ApplyOutOfSyncOnly=true
          - CreateNamespace=true
```

Each microservice gets its own ArgoCD Application, and each one only applies what is actually different during sync. When you update the `orders` service, only the resources in the `orders` application get re-applied - and within that application, only the specific resources that changed.

## Verifying the Behavior

You can observe the effect of ApplyOutOfSyncOnly by watching the sync operation details:

```bash
# Check which resources were synced
argocd app get my-large-app --show-operation

# Watch the sync in real time
argocd app sync my-large-app --sync-option ApplyOutOfSyncOnly=true --dry-run
```

The `--dry-run` flag shows you what would be synced without actually doing it. This lets you verify that only the expected resources are in the sync plan.

## Combining with Other Sync Options

ApplyOutOfSyncOnly pairs well with other sync options:

```yaml
syncOptions:
  - ApplyOutOfSyncOnly=true
  - PruneLast=true          # Prune deleted resources after all applies
  - ServerSideApply=true     # Use server-side apply for conflict resolution
  - CreateNamespace=true     # Create namespace if it does not exist
```

The combination of `ApplyOutOfSyncOnly` and `PruneLast` is particularly common. It ensures that only changed resources are applied, and any resources that were removed from Git are cleaned up at the end.

## Performance Impact

In real-world deployments, the performance improvement can be significant. For an application with 150 resources where 3 changed:

- Without ApplyOutOfSyncOnly: ~45 seconds to apply all 150 resources
- With ApplyOutOfSyncOnly: ~3 seconds to apply 3 resources

The savings multiply when you have multiple applications syncing concurrently. Your ArgoCD application controller spends less time processing syncs, leaving more capacity for monitoring and health checks.

## Summary

The `ApplyOutOfSyncOnly` sync option is one of the most impactful performance optimizations you can enable in ArgoCD. It reduces sync time, minimizes API server load, and lowers the risk of unintended side effects during deployment. For any application with more than a handful of resources, it should be your default choice.

If you are looking to understand other sync options that complement this one, check out our guide on [how to use the PruneLast sync option](https://oneuptime.com/blog/post/2026-02-26-argocd-prunelast-sync-option/view) and [how to configure ArgoCD server-side apply](https://oneuptime.com/blog/post/2026-02-26-argocd-serversideapply-sync-option/view).

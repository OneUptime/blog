# How to configure ArgoCD sync policies for automated pruning and self-healing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Kubernetes, GitOps, DevOps, Automation

Description: Learn how to configure ArgoCD sync policies for automated pruning and self-healing to maintain consistent application state and automatically recover from configuration drift in Kubernetes clusters.

---

ArgoCD sync policies control how applications synchronize between Git repositories and Kubernetes clusters. Two critical features, automated pruning and self-healing, ensure your cluster state matches your Git source without manual intervention. This guide shows you how to configure these policies effectively.

## Understanding Sync Policies

Sync policies in ArgoCD determine automatic synchronization behavior. Without these policies, you must manually trigger syncs through the UI or CLI. With automated sync policies, ArgoCD continuously monitors Git repositories and applies changes automatically.

Pruning removes resources from the cluster that no longer exist in Git. Self-healing detects and corrects manual changes made directly to the cluster, reverting them to match Git state.

## Basic Automated Sync Configuration

Start with a basic automated sync policy in your Application manifest:

```yaml
# application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: demo-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/manifests
    targetRevision: main
    path: apps/demo
  destination:
    server: https://kubernetes.default.svc
    namespace: demo
  syncPolicy:
    automated: {}  # Enable automated sync
```

This configuration enables automated synchronization, but pruning and self-healing remain disabled by default for safety.

## Enabling Automated Pruning

Pruning automatically removes resources from the cluster when you delete them from Git. This prevents orphaned resources that consume cluster resources and create confusion:

```yaml
# application-with-pruning.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: demo-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/manifests
    targetRevision: main
    path: apps/demo
  destination:
    server: https://kubernetes.default.svc
    namespace: demo
  syncPolicy:
    automated:
      prune: true  # Enable automatic pruning
    syncOptions:
      - CreateNamespace=true
```

When you remove a deployment from Git, ArgoCD detects the change and deletes the corresponding Kubernetes resources automatically. This keeps your cluster clean and aligned with your Git source.

## Configuring Self-Healing

Self-healing monitors running applications and reverts manual changes. If someone modifies a deployment directly with kubectl, ArgoCD detects the drift and restores the Git-defined state:

```yaml
# application-with-self-healing.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: demo-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/manifests
    targetRevision: main
    path: apps/demo
  destination:
    server: https://kubernetes.default.svc
    namespace: demo
  syncPolicy:
    automated:
      prune: true
      selfHeal: true  # Enable self-healing
    syncOptions:
      - CreateNamespace=true
```

Self-healing triggers when ArgoCD detects differences between Git and cluster state. The reconciliation happens automatically within the configured sync interval.

## Combining Pruning and Self-Healing

For full GitOps automation, enable both features together:

```yaml
# fully-automated-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: production-app
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://github.com/your-org/production-manifests
    targetRevision: main
    path: apps/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true      # Remove deleted resources
      selfHeal: true   # Revert manual changes
    syncOptions:
      - CreateNamespace=true
      - PruneLast=true  # Prune resources after applying new ones
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

The `PruneLast` option ensures ArgoCD applies new resources before removing old ones, preventing service interruptions during updates.

## Controlling Pruning Behavior

Sometimes you need fine-grained control over what ArgoCD prunes. Use annotations to protect specific resources:

```yaml
# protected-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: manual-config
  namespace: demo
  annotations:
    argocd.argoproj.io/sync-options: Prune=false  # Never prune this resource
data:
  setting: value
```

This annotation prevents ArgoCD from deleting the resource even when it disappears from Git. Use this sparingly for resources managed outside ArgoCD.

## Sync Policy at Project Level

Define default sync policies at the AppProject level for consistency across multiple applications:

```yaml
# project-with-defaults.yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: platform-services
  namespace: argocd
spec:
  description: Platform infrastructure services
  sourceRepos:
    - 'https://github.com/your-org/*'
  destinations:
    - namespace: '*'
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: '*'
      kind: '*'
  # Default sync policy for all apps in this project
  syncWindows:
    - kind: allow
      schedule: '0 0 * * *'
      duration: 24h
      applications:
        - '*'
```

While AppProjects don't directly set automated sync policies, they control when syncs can occur through sync windows.

## Handling Sync Failures

Configure retry policies to handle transient failures during automated syncs:

```yaml
# application-with-retry.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: demo-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/manifests
    targetRevision: main
    path: apps/demo
  destination:
    server: https://kubernetes.default.svc
    namespace: demo
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    retry:
      limit: 10          # Retry up to 10 times
      backoff:
        duration: 5s     # Initial delay
        factor: 2        # Exponential backoff multiplier
        maxDuration: 5m  # Maximum delay between retries
```

This configuration retries failed syncs with exponential backoff, handling temporary issues like API server unavailability or resource quota limits.

## Selective Resource Management

Use resource tracking methods to control which resources ArgoCD manages:

```yaml
# application-with-tracking.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: demo-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/manifests
    targetRevision: main
    path: apps/demo
  destination:
    server: https://kubernetes.default.svc
    namespace: demo
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
  # Ignore differences in specific fields
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas  # Don't sync replica counts (allow HPA to manage)
```

The `ignoreDifferences` configuration prevents self-healing for specific fields, allowing external controllers like HPA to manage those values.

## Monitoring Sync Policy Behavior

Track sync policy effectiveness using ArgoCD metrics and logs:

```bash
# Check application sync status
kubectl get applications -n argocd

# View sync history
argocd app history demo-app

# Get detailed sync information
argocd app get demo-app --refresh

# Monitor sync operations
kubectl logs -n argocd deployment/argocd-application-controller -f | grep sync
```

These commands help you verify that pruning and self-healing work as expected.

## Best Practices

Start with manual sync in development environments to understand application behavior before enabling automation. Use automated sync with pruning and self-healing in staging and production for full GitOps benefits.

Always test pruning behavior in non-production environments first. Accidental deletion of critical resources can cause outages if not properly configured.

Document resources that require prune protection annotations. Make it clear to team members which resources ArgoCD manages and which remain manual.

Configure appropriate retry policies based on application characteristics. Services with complex dependencies may need more generous retry settings.

Use sync windows to control when automated syncs occur in production. This prevents unexpected changes during critical business hours.

Monitor ArgoCD logs and metrics to detect sync failures quickly. Set up alerts for applications stuck in out-of-sync states.

## Conclusion

ArgoCD sync policies with automated pruning and self-healing provide powerful GitOps automation. These features maintain consistent cluster state, automatically remove orphaned resources, and prevent configuration drift from manual changes. By properly configuring sync policies with appropriate safeguards, you create reliable, self-maintaining deployments that truly reflect your Git source of truth.

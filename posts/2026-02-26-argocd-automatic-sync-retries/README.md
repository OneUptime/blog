# How to Configure Automatic Sync Retries in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Sync Operations, Reliability

Description: Learn how to configure automatic sync retry policies in ArgoCD with backoff strategies to handle transient failures without manual intervention.

---

Production Kubernetes clusters are not perfect. API servers have brief hiccups, network connections drop, admission webhooks time out, and resource quotas temporarily fill up. When ArgoCD encounters these transient failures during sync, manually retrying every time is not practical - especially at 2 AM.

ArgoCD's retry policy lets you configure automatic retries with backoff strategies, so transient failures are handled automatically without human intervention.

## The Retry Policy Structure

The retry policy is part of the Application spec's `syncPolicy` section:

```yaml
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
    path: k8s/
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

The three backoff parameters control timing:
- `duration`: The initial wait time before the first retry
- `factor`: The multiplier applied to the duration for each subsequent retry
- `maxDuration`: The maximum wait time between retries, regardless of the factor

## How the Backoff Works

With the configuration above (`duration: 5s`, `factor: 2`, `maxDuration: 3m`), the retry timing looks like:

```text
Attempt 1: Sync fails
Wait 5s
Attempt 2: Sync fails
Wait 10s (5s * 2)
Attempt 3: Sync fails
Wait 20s (10s * 2)
Attempt 4: Sync fails
Wait 40s (20s * 2)
Attempt 5: Sync fails
Wait 80s (40s * 2)
No more retries (limit of 5 reached)
```

If `maxDuration` were set to `30s`, the timing would cap:

```text
Attempt 1: Wait 5s
Attempt 2: Wait 10s
Attempt 3: Wait 20s
Attempt 4: Wait 30s (capped by maxDuration)
Attempt 5: Wait 30s (capped by maxDuration)
```

## Basic Configuration Examples

### Conservative Retry for Production

```yaml
# Few retries with long waits - good for production
syncPolicy:
  automated:
    prune: true
    selfHeal: true
  retry:
    limit: 3
    backoff:
      duration: 30s
      factor: 2
      maxDuration: 5m
```

This gives the cluster time to recover between attempts. The total retry window is about 3.5 minutes (30s + 60s + 120s).

### Aggressive Retry for Development

```yaml
# Quick retries - good for dev where speed matters more
syncPolicy:
  automated:
    prune: true
  retry:
    limit: 10
    backoff:
      duration: 2s
      factor: 1.5
      maxDuration: 30s
```

This retries quickly and frequently, which is fine in development where you are iterating fast and failures are usually fixed by the next Git push.

### Moderate Retry for Staging

```yaml
# Balanced approach for staging environments
syncPolicy:
  automated:
    prune: true
    selfHeal: true
  retry:
    limit: 5
    backoff:
      duration: 10s
      factor: 2
      maxDuration: 2m
```

## Retry with Auto-Sync

The retry policy works hand-in-hand with auto-sync. When auto-sync detects a change and triggers a sync that fails, the retry policy kicks in:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-service
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/web-service.git
    targetRevision: main
    path: deploy/
  destination:
    server: https://kubernetes.default.svc
    namespace: web
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
    syncOptions:
      - CreateNamespace=true
```

The flow is:
1. A commit is pushed to Git
2. ArgoCD detects the change (via webhook or polling)
3. Auto-sync triggers a sync operation
4. If the sync fails, the retry policy begins
5. ArgoCD waits for the backoff duration and retries
6. This continues until the sync succeeds or the retry limit is reached
7. If all retries fail, the application stays in "Failed" state

## Retry Without Auto-Sync

You can configure retries even without auto-sync. In this case, retries only apply to manually triggered syncs:

```yaml
syncPolicy:
  # No 'automated' section
  retry:
    limit: 3
    backoff:
      duration: 10s
      factor: 2
      maxDuration: 1m
```

When you manually sync via CLI or UI, if the sync fails, ArgoCD automatically retries based on the policy.

## Monitoring Retry Status

You can monitor the retry status of your applications:

```bash
# Check current sync operation and retry count
argocd app get my-app --show-operation

# The output includes retry information:
# Operation:          Sync
# Sync Revision:      abc123
# Phase:              Failed
# Retry Count:        3/5
# Retry After:        20s
```

In the UI, the application card shows the retry counter when retries are in progress.

## When Retries Do Not Help

Retries are designed for transient failures. They do not help with:

- **Invalid manifests.** If your YAML has a syntax error, every retry will fail the same way.
- **Missing images.** If the container image does not exist, retries will not create it.
- **Permanent resource quota exceeded.** If your namespace is at its resource limit and nothing frees up, retries will keep failing.
- **RBAC issues.** If ArgoCD does not have permission to create a resource, retries will not grant permission.

For these cases, fix the root cause in Git or cluster configuration, then let the next auto-sync (or manual sync) succeed.

## Combining Retry with Notifications

Set up ArgoCD notifications to alert you when retries are exhausted:

```yaml
# In the Application metadata
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: critical-service
  namespace: argocd
  annotations:
    # Notify on sync failure after retries exhausted
    notifications.argoproj.io/subscribe.on-sync-failed.slack: devops-alerts
spec:
  syncPolicy:
    automated:
      prune: true
    retry:
      limit: 5
      backoff:
        duration: 10s
        factor: 2
        maxDuration: 3m
```

This way, you get a Slack notification only after all retries have been exhausted, filtering out transient noise.

## ApplicationSet with Retry Policy

When using ApplicationSets to generate multiple applications, each generated application can have its own retry policy:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: microservices
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/services.git
        revision: main
        directories:
          - path: services/*
  template:
    metadata:
      name: '{{path.basename}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/services.git
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
        retry:
          limit: 5
          backoff:
            duration: 5s
            factor: 2
            maxDuration: 3m
```

Every microservice application gets the same retry policy, ensuring consistent behavior across your fleet.

## Tuning Your Retry Policy

The right retry configuration depends on your environment. Here are guidelines:

**Limit**: Start with 3 to 5. More than 10 is usually excessive and masks real problems.

**Duration**: Start with 5 to 10 seconds. Shorter values work for dev, longer for production.

**Factor**: 2 is the standard exponential backoff factor. Use 1.5 for faster convergence or 3 for more conservative backoff.

**MaxDuration**: Set this to a reasonable ceiling. 3 to 5 minutes is typical. Longer waits usually mean the problem is not transient.

## Summary

Automatic sync retries in ArgoCD handle transient failures gracefully, keeping your deployments moving without manual intervention. Configure them on every production application with a reasonable limit and exponential backoff. Combine with notifications to get alerted when retries are exhausted, and remember that retries are for transient issues - persistent failures need root cause fixes.

For handling specific one-off retry scenarios, see our guide on [how to retry a failed sync in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-retry-failed-sync/view).

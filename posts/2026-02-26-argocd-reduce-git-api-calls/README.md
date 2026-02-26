# How to Reduce Git API Calls in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Git Optimization, Performance

Description: Learn how to reduce Git API calls from ArgoCD to avoid GitHub rate limits, reduce network costs, and improve sync performance.

---

Every ArgoCD installation constantly polls Git repositories to detect changes. With hundreds of applications, this adds up fast. I have seen ArgoCD installations hit GitHub's rate limit of 5,000 requests per hour, causing all applications to show as "Unknown" until the rate limit resets. Beyond rate limits, excessive Git API calls waste bandwidth and slow down sync detection.

In this guide, I will show you how to dramatically reduce Git API calls from ArgoCD while maintaining fast change detection.

## Understanding How ArgoCD Polls Git

ArgoCD checks each application's Git repository at a configurable interval to see if the target revision has changed. By default, this happens every 3 minutes for every application.

```mermaid
flowchart LR
    A[ArgoCD Repo Server] -->|Poll every 3min| B[Git API - ls-remote]
    A -->|On change detected| C[Git Clone/Fetch]
    C --> D[Manifest Generation]
    D --> E[Compare with Cluster State]
```

For each poll, ArgoCD makes at least one `git ls-remote` call. If a change is detected, it follows up with a `git fetch` or `git clone`. If you have 200 applications polling every 3 minutes, that is 4,000 API calls per hour just for polling.

## Strategy 1: Increase Polling Interval

The simplest reduction is to increase the polling interval.

```yaml
# argocd-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Increase from default 3m to 10m
  timeout.reconciliation: "600s"
```

This reduces polling calls by roughly 70%. For most environments, a 10-minute delay in change detection is perfectly acceptable.

For specific applications that need faster detection, you can override the interval.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: critical-app
  annotations:
    # Override global interval for this app
    argocd.argoproj.io/refresh: "hard"
spec:
  # ...
```

## Strategy 2: Use Webhooks Instead of Polling

The most effective way to reduce Git API calls is to replace polling with webhooks. When Git calls ArgoCD on push, ArgoCD only needs to check repositories that actually changed.

### GitHub Webhook Setup

Configure a webhook in your GitHub repository or organization settings.

```bash
# Create a webhook secret
kubectl create secret generic argocd-webhook-secret \
  --from-literal=webhook.github.secret=your-secret-here \
  -n argocd
```

```yaml
# argocd-secret (add webhook secret)
apiVersion: v1
kind: Secret
metadata:
  name: argocd-secret
  namespace: argocd
stringData:
  webhook.github.secret: "your-webhook-secret-here"
```

Configure the webhook in GitHub to point to `https://argocd.myorg.com/api/webhook` with content type `application/json` and the `push` event.

### GitLab Webhook Setup

For GitLab, configure the webhook with a secret token.

```yaml
# argocd-secret
stringData:
  webhook.gitlab.secret: "your-gitlab-webhook-secret"
```

### Reducing Polling After Webhook Setup

Once webhooks are working, you can safely increase the polling interval to 30 minutes or more. The webhook triggers immediate sync on push, and the long polling interval serves as a safety net.

```yaml
# argocd-cm.yaml
data:
  # 30 minutes - webhooks handle normal flow
  timeout.reconciliation: "1800s"
```

This combination - webhooks for real-time detection plus infrequent polling as fallback - reduces Git API calls by 90% or more.

## Strategy 3: Repository Deduplication

If multiple applications use the same Git repository, ArgoCD might make redundant calls. Use credential templates to help ArgoCD recognize they are the same repository.

```yaml
# argocd-cm.yaml
data:
  repository.credentials: |
    - url: https://github.com/myorg
      type: git
      passwordSecret:
        name: github-creds
        key: password
      usernameSecret:
        name: github-creds
        key: username
```

When ArgoCD recognizes multiple applications share a repository, it can batch the checks.

## Strategy 4: Use Git Submodules Carefully

If your GitOps repository uses submodules, every submodule is a separate Git repository that ArgoCD needs to poll. Avoid submodules where possible. Instead, use Kustomize remote bases or Helm dependencies which are fetched differently.

```yaml
# argocd-cmd-params-cm.yaml
data:
  # Disable submodule checkout if not needed
  reposerver.enable.git.submodule: "false"
```

## Strategy 5: Use GitHub App Authentication

GitHub Apps have higher rate limits (5,000 requests per installation per hour) compared to personal access tokens (5,000 per user per hour). If multiple teams share a token, they share the limit. A GitHub App gets its own allocation.

```yaml
# Configure GitHub App in ArgoCD
apiVersion: v1
kind: Secret
metadata:
  name: github-app-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/myorg
  githubAppID: "12345"
  githubAppInstallationID: "67890"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    ...
    -----END RSA PRIVATE KEY-----
```

## Strategy 6: Optimize Manifest Caching

ArgoCD caches generated manifests in Redis. Properly configured caching means ArgoCD does not need to re-clone and re-render manifests when nothing has changed.

```yaml
# argocd-cmd-params-cm.yaml
data:
  # Cache manifests for 24 hours
  reposerver.repo.cache.expiration: "24h"
```

Monitor cache hit rates to ensure caching is effective.

```bash
# Check repo server cache metrics
kubectl exec -n argocd deploy/argocd-repo-server -- \
  curl -s localhost:8084/metrics | grep argocd_repo_cache
```

## Strategy 7: Monorepo Optimization

If you use a monorepo structure where many applications point to different paths in the same repository, ArgoCD fetches the entire repository for each application. Optimize this with sparse checkout or by splitting into smaller repositories.

For monorepos that must stay as one repository, ensure ArgoCD only watches the relevant paths.

```yaml
# Application spec with directory-specific tracking
spec:
  source:
    repoURL: https://github.com/myorg/monorepo.git
    path: apps/production/my-service
    targetRevision: main
    directory:
      recurse: false  # Don't recurse into subdirectories
```

## Monitoring Git API Usage

Track your Git API call rate to ensure optimizations are working.

```bash
# Check GitHub rate limit status
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/rate_limit

# ArgoCD repo server metrics for Git operations
kubectl exec -n argocd deploy/argocd-repo-server -- \
  curl -s localhost:8084/metrics | grep argocd_git_request_total
```

Create a Prometheus alert for approaching rate limits.

```yaml
# prometheus-alert.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-git-alerts
spec:
  groups:
    - name: argocd-git
      rules:
        - alert: ArgocdHighGitRequestRate
          expr: |
            sum(rate(argocd_git_request_total[5m])) > 1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD is making more than 60 Git requests per minute"
```

## Before and After Metrics

Here is a typical improvement after implementing these optimizations for an installation with 300 applications pointing to 50 repositories.

Before: approximately 6,000 Git API calls per hour, frequent rate limiting, 5-minute average change detection time.

After with webhooks and 30-minute polling: approximately 200 Git API calls per hour (from fallback polling), zero rate limiting, sub-minute change detection via webhooks.

## Conclusion

Reducing Git API calls in ArgoCD is primarily about switching from polling to webhooks. Once webhooks handle real-time change detection, increase the polling interval to a long fallback period. Layer on repository deduplication, GitHub App authentication for better rate limits, and manifest caching to squeeze out remaining inefficiency. Monitor your Git API usage continuously and set alerts before you hit rate limits. These optimizations are especially critical for organizations using GitHub's free tier or sharing API tokens across multiple tools.

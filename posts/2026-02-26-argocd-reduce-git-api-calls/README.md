# How to Reduce Git API Calls in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Git Optimization, Performance

Description: Learn how to reduce Git API calls from ArgoCD to avoid GitHub rate limits, reduce network costs, and improve sync performance.

---

Every ArgoCD installation constantly polls Git repositories to detect changes. With hundreds of applications, this adds up fast. I have seen ArgoCD installations hit provider throttling or network limits, causing all applications to show as "Unknown" until the service recovers. Beyond rate limits, excessive Git requests waste bandwidth and slow down sync detection.

In this guide, I will show you how to dramatically reduce Git requests from ArgoCD while maintaining fast change detection.

## Understanding How ArgoCD Polls Git

ArgoCD checks each application's Git repository at a configurable interval to see if the target revision has changed. By default, this happens every 3 minutes for every application.

```mermaid
flowchart LR
    A[ArgoCD Repo Server] -->|Poll every 3min| B[Git remote - ls-remote]
    A -->|On change detected| C[Git Clone/Fetch]
    C --> D[Manifest Generation]
    D --> E[Compare with Cluster State]
```

For each poll, ArgoCD makes at least one `git ls-remote` call. If a change is detected, it follows up with a `git fetch` or `git clone`. If you have 200 applications polling every 3 minutes, that is 4,000 Git requests per hour just for polling.

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

For specific applications that need faster detection, trigger a refresh from CI after pushing a change.

```bash
# Request a hard refresh for one application
kubectl annotate application critical-app \
  -n argocd \
  argocd.argoproj.io/refresh=hard \
  --overwrite
```

## Strategy 2: Use Webhooks Instead of Polling

The most effective way to reduce Git requests is to replace frequent polling with webhooks. When your Git provider calls ArgoCD on push, ArgoCD only needs to refresh applications for repositories that actually changed.

### GitHub Webhook Setup

Configure a webhook in your GitHub repository or organization settings.

```bash
# Add the webhook secret to argocd-secret
kubectl patch secret argocd-secret \
  -n argocd \
  --type merge \
  -p '{"stringData":{"webhook.github.secret":"your-secret-here"}}'
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

Once webhooks are working, you can safely increase the polling interval to 30 minutes or more. The webhook triggers an immediate application refresh on push, and applications with automated sync enabled can then sync automatically. The long polling interval serves as a safety net.

```yaml
# argocd-cm.yaml
data:
  # 30 minutes - webhooks handle normal flow
  timeout.reconciliation: "1800s"
```

This combination - webhooks for real-time detection plus infrequent polling as fallback - reduces Git requests by 90% or more.

## Strategy 3: Repository Deduplication

If multiple applications use the same Git repository, keep the repository URL consistent and use credential templates so you do not create duplicate repository credential entries.

```yaml
# argocd-repo-creds.yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  url: https://github.com/myorg
  type: git
  username: your-username
  password: your-token
```

ArgoCD maintains local repository clones and caches generated manifests by repository revision, so consistent repository configuration helps those caches work as intended.

## Strategy 4: Use Git Submodules Carefully

If your GitOps repository uses submodules, every submodule is a separate Git repository that ArgoCD may need to fetch during repository checkout. Avoid submodules where possible. Instead, use Kustomize remote bases or Helm dependencies intentionally and account for their own caching behavior.

```yaml
# argocd-cmd-params-cm.yaml
data:
  # Disable submodule checkout if not needed
  reposerver.enable.git.submodule: "false"
```

## Strategy 5: Use GitHub App Authentication

GitHub Apps have their own installation rate limit, starting at 5,000 requests per installation per hour and scaling higher for larger organizations, while personal access tokens use the authenticated user's rate limit. If multiple teams share a token, they share the limit. A GitHub App gets its own allocation.

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

ArgoCD caches generated manifests in Redis. Properly configured caching means ArgoCD does not need to re-render manifests when nothing has changed.

```yaml
# argocd-cmd-params-cm.yaml
data:
  # Cache manifests for 24 hours
  reposerver.repo.cache.expiration: "24h"
```

Monitor repo-server Git request metrics to ensure caching is effective.

```bash
# Check repo server Git request metrics
kubectl exec -n argocd deploy/argocd-repo-server -- \
  curl -s localhost:8084/metrics | grep argocd_git_request_total
```

## Strategy 7: Monorepo Optimization

If you use a monorepo structure where many applications point to different paths in the same repository, ArgoCD uses the repository commit SHA as a manifest cache key. A new commit can invalidate generated manifests for all applications in that repository. Optimize this with manifest path annotations or by splitting into smaller repositories.

For monorepos that must stay as one repository, ensure ArgoCD only watches the relevant paths.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-service
  annotations:
    argocd.argoproj.io/manifest-generate-paths: .
spec:
  source:
    repoURL: https://github.com/myorg/monorepo.git
    path: apps/production/my-service
    targetRevision: main
```

## Monitoring Git Usage

Track your Git request rate and GitHub API rate limit status to ensure optimizations are working.

```bash
# Check GitHub rate limit status
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
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

Before: approximately 6,000 Git requests per hour, frequent provider throttling, 5-minute average change detection time.

After with webhooks and 30-minute polling: approximately 200 Git requests per hour (from fallback polling), no provider throttling, sub-minute change detection via webhooks.

## Conclusion

Reducing Git requests in ArgoCD is primarily about switching from polling to webhooks. Once webhooks handle real-time change detection, increase the polling interval to a long fallback period. Layer on repository deduplication, GitHub App authentication for separate rate limits, and manifest caching to squeeze out remaining inefficiency. Monitor your Git usage continuously and set alerts before you hit provider limits. These optimizations are especially critical for organizations running many applications from a small set of repositories or sharing credentials across multiple tools.

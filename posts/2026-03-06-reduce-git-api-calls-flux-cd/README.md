# How to Reduce Git API Calls from Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, kubernetes, gitops, git api, rate limiting, github, gitlab, performance

Description: A practical guide to reducing Git API calls from Flux CD to avoid rate limiting, lower costs, and improve overall performance when using GitHub, GitLab, or Bitbucket.

---

Flux CD makes regular API calls to Git providers to check for changes and fetch repository content. In organizations with many clusters and repositories, these calls can trigger rate limits on platforms like GitHub, GitLab, and Bitbucket. This guide covers techniques to minimize Git API calls while maintaining fast change detection.

## Understanding Git API Call Sources

Flux CD generates Git API calls from several sources:

- **GitRepository reconciliation**: Each reconciliation polls the Git provider via ls-remote to check for ref changes
- **Webhook receiver validation**: Verifying webhook signatures involves API calls
- **Image automation commits**: Pushing updated image tags to Git generates write API calls
- **Notification provider**: Sending commit status updates uses the Git provider API

The primary source of API calls is GitRepository polling. Every reconciliation cycle calls `git ls-remote` to check if the tracked ref has changed.

## Calculating Your API Call Budget

Git providers impose rate limits that you need to plan around:

| Provider | Rate Limit | Window |
|---|---|---|
| GitHub (authenticated) | 5,000 requests/hour | Per token |
| GitHub (unauthenticated) | 60 requests/hour | Per IP |
| GitLab (authenticated) | 2,000 requests/minute | Per user |
| Bitbucket Cloud | 1,000 requests/hour | Per user |

Calculate your current call rate:

```yaml
# Estimation formula:
# API calls per hour = (number of GitRepositories) * (60 / interval_minutes) * (number of clusters)
#
# Example:
# 20 GitRepositories * (60 / 5 min interval) * 3 clusters
# = 20 * 12 * 3 = 720 API calls/hour
#
# With a single GitHub token (5000/hour limit), this is fine.
# But if each cluster uses its own token, each token sees 240 calls/hour.
#
# Optimized with 30m intervals:
# 20 * 2 * 3 = 120 API calls/hour (83% reduction)
```

## Increasing GitRepository Intervals

The simplest way to reduce API calls is to increase reconciliation intervals.

```yaml
# Before: Aggressive polling generates many API calls
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # 5-minute interval = 12 API calls per hour per cluster
  interval: 5m
  url: https://github.com/org/my-app
  ref:
    branch: main
---
# After: Longer interval with webhook supplementing
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # 1-hour interval = 1 API call per hour per cluster
  # Webhooks provide immediate change detection
  interval: 1h
  url: https://github.com/org/my-app
  ref:
    branch: main
```

## Setting Up Webhooks for Push-Based Triggers

Replace polling with webhooks to get instant change detection without constant API calls.

```yaml
# Receiver for GitHub push events
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-push
  namespace: flux-system
spec:
  type: github
  events:
    - "ping"
    - "push"
  secretRef:
    name: webhook-token
  resources:
    # List all GitRepositories that should be triggered
    - kind: GitRepository
      name: my-app
      namespace: flux-system
    - kind: GitRepository
      name: infrastructure
      namespace: flux-system
    - kind: GitRepository
      name: platform
      namespace: flux-system
---
apiVersion: v1
kind: Secret
metadata:
  name: webhook-token
  namespace: flux-system
type: Opaque
stringData:
  token: "strong-random-webhook-secret"
```

For GitLab:

```yaml
# Receiver for GitLab push events
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gitlab-push
  namespace: flux-system
spec:
  type: gitlab
  events:
    - "Push Hook"
    - "Tag Push Hook"
  secretRef:
    name: gitlab-webhook-token
  resources:
    - kind: GitRepository
      name: my-app
      namespace: flux-system
```

For Bitbucket:

```yaml
# Receiver for Bitbucket push events
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: bitbucket-push
  namespace: flux-system
spec:
  type: bitbucket
  events:
    - "repo:push"
  secretRef:
    name: bitbucket-webhook-token
  resources:
    - kind: GitRepository
      name: my-app
      namespace: flux-system
```

## Consolidating GitRepositories

Reduce the number of GitRepository resources by sharing sources across multiple Kustomizations.

```yaml
# Bad: Separate GitRepository per application (more API calls)
# Each GitRepository polls independently
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-a
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/org/monorepo
  ref:
    branch: main
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-b
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/org/monorepo
  ref:
    branch: main
```

```yaml
# Good: Single GitRepository shared by multiple Kustomizations
# Only one set of API calls for the entire monorepo
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: monorepo
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/org/monorepo
  ref:
    branch: main
  ignore: |
    /*
    !/apps/
    !/infrastructure/
---
# Multiple Kustomizations reference the same GitRepository
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-a
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/app-a
  prune: true
  sourceRef:
    kind: GitRepository
    name: monorepo
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-b
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/app-b
  prune: true
  sourceRef:
    kind: GitRepository
    name: monorepo
```

## Using Dedicated Git Tokens Per Cluster

Distribute API calls across multiple tokens to avoid hitting a single token's rate limit.

```yaml
# Each cluster uses its own Git credentials
# This distributes API calls across multiple tokens
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials
  namespace: flux-system
type: Opaque
stringData:
  # Use a cluster-specific deploy token
  # Production cluster uses token A
  username: "flux-production"
  password: "ghp_productionClusterToken123456"
---
# On staging cluster, use a different token
# apiVersion: v1
# kind: Secret
# metadata:
#   name: git-credentials
#   namespace: flux-system
# type: Opaque
# stringData:
#   username: "flux-staging"
#   password: "ghp_stagingClusterToken789012"
```

## Using a Git Proxy or Cache

Deploy a Git proxy that caches responses and reduces upstream API calls.

```yaml
# Git caching proxy deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: git-cache-proxy
  namespace: flux-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: git-cache-proxy
  template:
    metadata:
      labels:
        app: git-cache-proxy
    spec:
      containers:
        - name: proxy
          image: jonaharagon/git-cache:latest
          ports:
            - containerPort: 8080
          env:
            # Cache Git responses for 5 minutes
            - name: CACHE_TTL
              value: "300"
            # Upstream Git server
            - name: UPSTREAM_URL
              value: "https://github.com"
          resources:
            requests:
              cpu: "100m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: git-cache-proxy
  namespace: flux-system
spec:
  selector:
    app: git-cache-proxy
  ports:
    - port: 8080
      targetPort: 8080
```

Point GitRepositories to the proxy:

```yaml
# GitRepository using local cache proxy
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # Point to the local proxy instead of GitHub directly
  url: http://git-cache-proxy.flux-system:8080/org/my-app
  ref:
    branch: main
  secretRef:
    name: git-credentials
```

## Reducing Image Automation Git Writes

Image automation controllers push commits to Git, which counts against write rate limits.

```yaml
# ImageUpdateAutomation with batched commits
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: image-updates
  namespace: flux-system
spec:
  # Longer interval batches multiple image updates into fewer commits
  # Instead of committing each image update individually,
  # wait 30 minutes to batch them
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-image-automation
        email: flux@example.com
      # Clear commit message indicates automated change
      messageTemplate: |
        Automated image update

        {{ range .Changed.Changes -}}
        - {{ .OldValue }} -> {{ .NewValue }}
        {{ end }}
    push:
      branch: main
```

## Monitoring Git API Usage

Track Git API calls to stay within rate limits.

```yaml
# PrometheusRule for Git API call monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-git-api-alerts
  namespace: flux-system
spec:
  groups:
    - name: flux-git-api
      rules:
        # Track Git fetch rate
        - record: flux:git_fetch_rate:1h
          expr: |
            sum(increase(gotk_reconcile_duration_seconds_count{
              kind="GitRepository"
            }[1h]))

        # Alert when approaching GitHub rate limit
        - alert: FluxGitAPIRateHigh
          expr: |
            sum(rate(gotk_reconcile_duration_seconds_count{
              kind="GitRepository"
            }[5m])) * 3600 > 4000
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Flux Git API rate projected at {{ $value }}/hour"
            description: "Approaching GitHub rate limit of 5000/hour."

        # Alert on authentication failures (may indicate rate limiting)
        - alert: FluxGitAuthFailure
          expr: |
            gotk_reconcile_condition{
              kind="GitRepository",
              type="Ready",
              status="False"
            } == 1
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "GitRepository {{ $labels.name }} authentication failing"
            description: "May be rate limited. Check Git provider API quotas."
```

## Summary

Key strategies for reducing Git API calls from Flux CD:

1. Increase GitRepository reconciliation intervals (biggest impact)
2. Set up webhook receivers for push-based change detection
3. Consolidate multiple GitRepositories pointing to the same repo into one shared source
4. Use dedicated Git tokens per cluster to distribute rate limits
5. Deploy a Git caching proxy for clusters that poll the same repositories
6. Batch image automation commits with longer intervals
7. Monitor API call rates and set alerts before hitting rate limits

The webhook-plus-long-interval pattern is the recommended approach. It provides instant change detection while reducing scheduled API calls by 90% or more compared to short polling intervals.

# How to Handle Rate Limiting from Git Providers in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Rate Limiting, Git Providers, GitHub, GitLab, Performance

Description: A practical guide to identifying, preventing, and handling rate limiting issues from Git providers when using Flux CD for continuous delivery.

---

## Introduction

When Flux CD reconciles your Git repositories, it makes API calls to your Git provider (GitHub, GitLab, Bitbucket, etc.). At scale, these calls can hit rate limits, causing reconciliation failures, delayed deployments, and degraded cluster operations. This guide covers how to detect, prevent, and handle rate limiting from Git providers in Flux CD.

## Understanding Git Provider Rate Limits

Different Git providers enforce different rate limits:

- **GitHub**: 5,000 requests per hour for authenticated users, 60 for unauthenticated
- **GitLab**: 300 requests per minute for authenticated users
- **Bitbucket**: 1,000 requests per hour for authenticated users

Flux CD controllers continuously poll Git repositories for changes, and each poll consumes API quota.

## Identifying Rate Limiting Issues

### Check Flux CD Events for Rate Limit Errors

```bash
# Look for rate-limit related errors in Flux events
kubectl get events -n flux-system --field-selector reason=ReconciliationFailed

# Check source-controller logs for HTTP 429 responses
kubectl logs -n flux-system deploy/source-controller | grep -i "rate"

# Check the status of all GitRepository sources
kubectl get gitrepositories -A -o wide
```

### Monitor GitRepository Reconciliation Status

```yaml
# gitrepository-status-check.yaml
# A script to check all GitRepository objects for rate limit issues
apiVersion: batch/v1
kind: Job
metadata:
  name: check-git-rate-limits
  namespace: flux-system
spec:
  template:
    spec:
      serviceAccountName: flux-rate-checker
      containers:
        - name: checker
          image: bitnami/kubectl:latest
          command:
            - /bin/sh
            - -c
            - |
              # List all GitRepository objects and their conditions
              kubectl get gitrepositories -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}: {.status.conditions[*].message}{"\n"}{end}'
      restartPolicy: Never
```

## Adjusting Reconciliation Intervals

The most effective way to reduce API calls is to increase reconciliation intervals.

### Configure GitRepository Intervals

```yaml
# gitrepository-optimized.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # Increase interval from default 1m to 5m to reduce API calls
  interval: 5m
  url: https://github.com/my-org/my-app
  ref:
    branch: main
  secretRef:
    name: git-credentials
  # Use .sourceignore to skip unnecessary files and reduce payload
  ignore: |
    # Ignore non-deployment files to reduce clone size
    docs/
    tests/
    *.md
    !README.md
```

### Configure Kustomization Intervals to Match

```yaml
# kustomization-optimized.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  # Match or exceed the GitRepository interval
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-app
  path: ./deploy
  prune: true
  # Set a timeout for apply operations
  timeout: 3m
```

## Using Git Provider Authentication Tokens

Authenticated requests get higher rate limits. Always use authentication tokens.

### GitHub Personal Access Token

```yaml
# github-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: git-credentials
  namespace: flux-system
type: Opaque
stringData:
  # Use a fine-grained personal access token with minimal permissions
  # Only grant read access to the specific repositories Flux needs
  username: git
  password: ghp_your_github_token_here
```

### GitHub App Authentication (Higher Rate Limits)

```yaml
# github-app-secret.yaml
# GitHub Apps get 5,000 requests per hour per installation
# This is separate from user rate limits
apiVersion: v1
kind: Secret
metadata:
  name: github-app-credentials
  namespace: flux-system
type: Opaque
stringData:
  # GitHub App credentials provide higher rate limits
  # 5,000 requests per hour per installation vs per user
  githubAppID: "12345"
  githubAppInstallationID: "67890"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    ...your-private-key...
    -----END RSA PRIVATE KEY-----
```

### GitLab Deploy Token

```yaml
# gitlab-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: gitlab-credentials
  namespace: flux-system
type: Opaque
stringData:
  # Use a deploy token scoped to read_repository only
  username: gitlab-deploy-token
  password: your_gitlab_deploy_token_here
```

## Consolidating Git Repositories

Reduce the number of GitRepository objects by consolidating configurations into fewer repositories.

### Before: Multiple Repositories

```yaml
# AVOID: Each GitRepository adds polling overhead
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-frontend
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/my-org/frontend
  ref:
    branch: main
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-backend
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/my-org/backend
  ref:
    branch: main
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: app-database
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/my-org/database
  ref:
    branch: main
```

### After: Single Monorepo

```yaml
# BETTER: Single GitRepository with multiple Kustomizations
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: platform-config
  namespace: flux-system
spec:
  # One repository, one polling interval
  interval: 5m
  url: https://github.com/my-org/platform-config
  ref:
    branch: main
  secretRef:
    name: git-credentials
---
# Each Kustomization points to a different path in the same repo
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: frontend
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: platform-config
  path: ./apps/frontend
  prune: true
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: backend
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: platform-config
  path: ./apps/backend
  prune: true
```

## Setting Up Webhook Receivers

Replace polling with webhook-based reconciliation to eliminate unnecessary API calls.

### Configure a Flux Webhook Receiver

```yaml
# webhook-receiver.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-webhook
  namespace: flux-system
spec:
  # Type matches your Git provider
  type: github
  # Events that trigger reconciliation
  events:
    - "ping"
    - "push"
  secretRef:
    name: webhook-secret
  resources:
    # Only trigger for the specific GitRepository
    - kind: GitRepository
      name: platform-config
      namespace: flux-system
---
# Secret for webhook validation
apiVersion: v1
kind: Secret
metadata:
  name: webhook-secret
  namespace: flux-system
type: Opaque
stringData:
  token: your-webhook-shared-secret
```

### Expose the Webhook Endpoint

```yaml
# webhook-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-webhook
  namespace: flux-system
  annotations:
    # Use your ingress controller annotations
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  rules:
    - host: flux-webhook.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                # The notification-controller creates this service
                name: notification-controller
                port:
                  number: 80
  tls:
    - hosts:
        - flux-webhook.example.com
      secretName: flux-webhook-tls
```

### Increase Interval When Using Webhooks

```yaml
# gitrepository-with-webhook.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: platform-config
  namespace: flux-system
spec:
  # With webhooks, polling is only a safety net
  # Set a long interval to minimize API calls
  interval: 30m
  url: https://github.com/my-org/platform-config
  ref:
    branch: main
  secretRef:
    name: git-credentials
```

## Monitoring Rate Limit Usage

### Prometheus Alerting for Rate Limits

```yaml
# rate-limit-alert.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-rate-limit-alerts
  namespace: flux-system
spec:
  groups:
    - name: flux-rate-limits
      rules:
        # Alert when reconciliation failures spike
        - alert: FluxGitReconciliationFailures
          expr: |
            rate(gotk_reconcile_condition{type="Ready",status="False",kind="GitRepository"}[5m]) > 0.1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Flux GitRepository reconciliation failures detected"
            description: "GitRepository {{ $labels.name }} in namespace {{ $labels.namespace }} is failing reconciliation. This may indicate rate limiting."
        # Alert on increased reconciliation duration
        - alert: FluxGitReconciliationSlow
          expr: |
            gotk_reconcile_duration_seconds{kind="GitRepository"} > 60
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Flux GitRepository reconciliation is slow"
            description: "GitRepository {{ $labels.name }} reconciliation taking over 60 seconds."
```

## Implementing Retry Backoff Strategy

Configure Flux to handle transient rate limit errors gracefully.

```yaml
# gitrepository-with-retry.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  # Retry interval when reconciliation fails
  # This applies exponential backoff on failures
  retryInterval: 2m
  url: https://github.com/my-org/my-app
  ref:
    branch: main
  secretRef:
    name: git-credentials
  # Suspend reconciliation if rate limited persistently
  # Can be toggled manually: flux resume source git my-app
  suspend: false
```

## Best Practices Summary

1. **Always authenticate** - Use tokens or SSH keys to get higher rate limits
2. **Use GitHub Apps** - They provide separate, higher rate limits than personal tokens
3. **Consolidate repositories** - Fewer GitRepository objects means fewer API calls
4. **Increase intervals** - Set reconciliation intervals to 5-10 minutes for non-critical workloads
5. **Implement webhooks** - Push-based triggers eliminate unnecessary polling
6. **Monitor proactively** - Set up alerts before rate limits become an issue
7. **Use .sourceignore** - Reduce clone payloads by excluding unnecessary files
8. **Stagger reconciliation** - Offset intervals across GitRepository objects to spread API calls

## Conclusion

Rate limiting from Git providers is a common challenge when running Flux CD at scale. By consolidating repositories, increasing reconciliation intervals, implementing webhook receivers, and monitoring API usage, you can maintain reliable GitOps workflows without hitting rate limits. The key principle is to minimize unnecessary polling while ensuring timely delivery of configuration changes.

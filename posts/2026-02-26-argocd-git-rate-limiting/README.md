# How to Handle Git Rate Limiting Issues in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Git, Rate Limiting

Description: Learn how to identify, prevent, and work around Git provider rate limiting issues in ArgoCD to keep your reconciliation pipeline running smoothly.

---

Git provider rate limiting is one of the most frustrating operational issues in ArgoCD. When ArgoCD hits rate limits on GitHub, GitLab, or Bitbucket, reconciliation stops working, applications go stale, and your entire GitOps pipeline grinds to a halt. The problem gets worse as you scale - more applications means more Git requests, which means you hit rate limits faster. This guide covers how to detect rate limiting, prevent it, and work around it when it happens.

## Understanding Git Provider Rate Limits

Each Git provider has different rate limits:

| Provider | API Rate Limit | Git Clone Limit | Auth Type |
|----------|---------------|-----------------|-----------|
| GitHub.com | 5,000/hr (authenticated) | Varies | PAT, SSH, App |
| GitHub.com | 60/hr (unauthenticated) | Very low | None |
| GitLab.com | 2,000/min (authenticated) | Varies | PAT, SSH |
| Bitbucket Cloud | 1,000/hr | Varies | App password |
| Azure DevOps | 200 requests/min | Varies | PAT |

ArgoCD makes Git requests during every reconciliation cycle. With 200 applications and a 3-minute reconciliation interval, ArgoCD makes roughly 4,000 Git requests per hour - close to GitHub's limit.

## Detecting Rate Limiting

### Check Repo Server Logs

```bash
# Look for rate limit errors in repo server logs
kubectl logs -n argocd deployment/argocd-repo-server --tail=500 | \
  grep -iE "rate.limit|429|too many|abuse|secondary"
```

Common error messages by provider:

```
# GitHub
"API rate limit exceeded"
"You have exceeded a secondary rate limit"
"abuse detection mechanism"

# GitLab
"429 Too Many Requests"
"Rate limit exceeded"

# Bitbucket
"Rate limit for this resource has been exceeded"
```

### Check Metrics

```bash
# Port-forward repo server metrics
kubectl port-forward svc/argocd-repo-server -n argocd 8084:8084 &

# Check for failed Git requests
curl -s http://localhost:8084/metrics | grep argocd_git_request_total

# Look for error counts
curl -s http://localhost:8084/metrics | grep -E "argocd_git_request_total.*error"
```

### Check Application Status

Rate-limited applications typically show:

```bash
# Find applications with repo errors
argocd app list -o json | jq '.[] | select(.status.conditions != null) | select(.status.conditions[].type == "ComparisonError") | {name: .metadata.name, message: .status.conditions[0].message}'
```

## Prevention Strategy 1: Increase Reconciliation Interval

The most effective way to reduce Git requests is to reconcile less frequently:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Increase from 3 minutes to 10 minutes
  timeout.reconciliation: "600"
```

This reduces Git requests by more than 3x. Combine with webhooks for immediate change detection:

```yaml
# Set webhook secret for instant push notifications
apiVersion: v1
kind: Secret
metadata:
  name: argocd-secret
  namespace: argocd
stringData:
  webhook.github.secret: "your-webhook-secret"
```

## Prevention Strategy 2: Enable Git Caching

The repo server caches Git repositories locally. Ensure the cache is working and properly sized:

```yaml
# argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Cache expiration (default: 24h)
  reposerver.repo.cache.expiration: "48h"
```

Use persistent volumes so the cache survives pod restarts:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      volumes:
        - name: repo-cache
          persistentVolumeClaim:
            claimName: argocd-repo-cache
      containers:
        - name: argocd-repo-server
          volumeMounts:
            - name: repo-cache
              mountPath: /tmp
```

With a warm cache, ArgoCD only needs to `git fetch` (lightweight) instead of `git clone` (heavy).

## Prevention Strategy 3: Use GitHub Apps Instead of PATs

GitHub App tokens have higher rate limits than Personal Access Tokens:

- PAT: 5,000 requests/hour (shared across all uses of the token)
- GitHub App: 5,000 requests/hour per installation (plus 5,000 per organization)

```yaml
# Configure ArgoCD to use a GitHub App
apiVersion: v1
kind: Secret
metadata:
  name: github-app-repo-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: https://github.com/your-org
  githubAppID: "12345"
  githubAppInstallationID: "67890"
  githubAppPrivateKey: |
    -----BEGIN RSA PRIVATE KEY-----
    ...
    -----END RSA PRIVATE KEY-----
```

## Prevention Strategy 4: Consolidate Repositories

If multiple applications reference the same repository, ArgoCD still makes separate Git requests for each. Consolidating reduces the total request count:

```yaml
# Instead of 10 apps each pointing to the same repo with different paths
# Use a single app-of-apps or ApplicationSet

apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: services
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/org/services
        revision: main
        directories:
          - path: services/*
  template:
    metadata:
      name: "{{path.basename}}"
    spec:
      source:
        repoURL: https://github.com/org/services
        targetRevision: main
        path: "{{path}}"
```

The repo server deduplicates clone requests for the same repo/revision, so multiple applications sharing the same repo benefit from the cache.

## Prevention Strategy 5: Use SSH Instead of HTTPS

SSH connections do not count against API rate limits on most providers. Switching to SSH reduces your API rate limit consumption:

```yaml
# Use SSH URL instead of HTTPS
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  source:
    repoURL: git@github.com:org/repo.git  # SSH
    # Instead of: https://github.com/org/repo.git  # HTTPS
```

Configure SSH credentials:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-ssh
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repo-creds
stringData:
  type: git
  url: git@github.com:org
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...
    -----END OPENSSH PRIVATE KEY-----
```

## Prevention Strategy 6: Add Reconciliation Jitter

Jitter prevents all applications from hitting Git simultaneously:

```yaml
# argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  controller.reconciliation.jitter: "120"
```

This spreads Git requests over a 2-minute window instead of all hitting at once.

## Handling Rate Limits When They Occur

If you are already being rate-limited:

### Immediate Mitigation

```bash
# Increase reconciliation interval immediately
kubectl patch configmap argocd-cm -n argocd \
  --type merge -p '{"data":{"timeout.reconciliation":"1800"}}'

# Restart the controller to apply
kubectl rollout restart deployment argocd-application-controller -n argocd
```

### Check Rate Limit Status

For GitHub:

```bash
# Check your current rate limit status
curl -H "Authorization: token YOUR_PAT" https://api.github.com/rate_limit | jq '.rate'

# Output shows:
# "limit": 5000
# "remaining": 42
# "reset": 1708900000  (Unix timestamp when limit resets)
```

For GitLab:

```bash
curl --head -H "PRIVATE-TOKEN: YOUR_TOKEN" "https://gitlab.com/api/v4/projects" 2>&1 | \
  grep -i "ratelimit"
```

### Wait for Reset

Rate limits reset on a rolling window. The fastest recovery is to wait:

```bash
# Calculate when GitHub rate limit resets
RESET=$(curl -s -H "Authorization: token YOUR_PAT" https://api.github.com/rate_limit | jq '.rate.reset')
echo "Rate limit resets at: $(date -d @$RESET)"
```

## Monitoring for Rate Limits

Set up proactive monitoring:

```yaml
groups:
  - name: argocd-rate-limiting
    rules:
      - alert: ArgocdGitRateLimitApproaching
        expr: |
          increase(argocd_git_request_total{request_type="fetch"}[1h]) > 3000
        labels:
          severity: warning
        annotations:
          summary: "ArgoCD is making >3000 Git requests/hour - rate limit risk"

      - alert: ArgocdGitRequestErrors
        expr: |
          rate(argocd_git_request_total{request_type="fetch",result="error"}[5m]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "ArgoCD is experiencing Git request errors - possible rate limiting"
```

For end-to-end monitoring of your Git request rates and early warning before you hit rate limits, [OneUptime](https://oneuptime.com) provides infrastructure monitoring that tracks ArgoCD's interaction with your Git providers.

## Key Takeaways

- Increase reconciliation interval and use webhooks as the first line of defense
- Enable Git caching with persistent volumes to reduce redundant requests
- Use GitHub Apps instead of PATs for higher rate limits
- Switch to SSH to avoid API rate limit consumption
- Add reconciliation jitter to spread requests over time
- Monitor Git request rates proactively to detect problems before they hit limits
- If rate-limited, immediately increase the reconciliation interval as emergency mitigation
- Consider consolidating repositories and using ApplicationSets to reduce unique Git targets

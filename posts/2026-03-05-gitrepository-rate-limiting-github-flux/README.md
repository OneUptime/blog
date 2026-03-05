# How to Handle GitRepository Rate Limiting from GitHub in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, GitHub, Rate Limiting, Performance

Description: Learn how to identify, prevent, and handle GitHub API rate limiting when using Flux CD GitRepository resources at scale.

---

When running Flux CD at scale with many GitRepository resources pointing to GitHub, you may encounter rate limiting. GitHub enforces rate limits on both API calls and Git operations, and Flux's polling behavior can quickly consume your quota. This guide explains how to recognize rate limiting issues, adjust your Flux configuration to stay within limits, and use authentication to increase your allowance.

## Understanding GitHub Rate Limits

GitHub applies different rate limits depending on the authentication method:

- **Unauthenticated requests:** 60 requests per hour per IP address
- **Authenticated requests (personal access token):** 5,000 requests per hour
- **GitHub App installations:** 5,000 to 15,000 requests per hour depending on the number of repositories

Flux performs Git clone and fetch operations, which count against these limits. Each GitRepository reconciliation triggers at least one Git operation.

## Identifying Rate Limiting Issues

Rate limiting manifests as failed reconciliation with specific error messages. Check your GitRepository status for signs of throttling.

Inspect GitRepository events for rate limit errors:

```bash
# Check the status of all Git sources
flux get sources git

# Look for rate-limit-related events
kubectl get events -n flux-system --field-selector reason=GitOperationFailed
```

Common error messages include:

- `403 rate limit exceeded`
- `429 Too Many Requests`
- `fatal: unable to access... The requested URL returned error: 403`

## Step 1: Always Use Authenticated Access

The single most effective measure is to authenticate all GitRepository resources. This raises your limit from 60 to 5,000 requests per hour.

Create a GitHub personal access token secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-token
  namespace: flux-system
type: Opaque
stringData:
  # Use a fine-grained personal access token with read-only repository access
  username: flux-bot
  password: ghp_your_github_personal_access_token_here
```

Reference the secret in every GitRepository:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/your-org/my-app.git
  ref:
    branch: main
  secretRef:
    # Authenticated requests get 5,000 req/hour instead of 60
    name: github-token
```

## Step 2: Increase the Reconciliation Interval

The default interval of 1 minute is aggressive for many use cases. Increasing it significantly reduces the number of requests.

Calculate your request budget based on the number of GitRepository resources:

```bash
# Formula: requests_per_hour = (60 / interval_minutes) * number_of_repos
# Example: 20 repos at 1m interval = 1,200 req/hour
# Example: 20 repos at 10m interval = 120 req/hour
# Example: 20 repos at 30m interval = 40 req/hour
```

Set a longer interval on GitRepository resources that do not need rapid updates:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  # Poll every 30 minutes for infrastructure that rarely changes
  interval: 30m
  url: https://github.com/your-org/infrastructure.git
  ref:
    branch: main
  secretRef:
    name: github-token
```

## Step 3: Use GitHub App Authentication

GitHub Apps receive higher rate limits and more granular permissions than personal access tokens.

First, create a GitHub App in your organization settings, then generate a private key. Create the secret with the App credentials:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-app-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: x-access-token
  # Use a script or controller to generate installation tokens from the App
  password: ghs_installation_access_token_here
```

Note: GitHub App installation tokens expire after one hour. You will need an external process or controller to refresh these tokens and update the secret.

## Step 4: Use Webhook Receivers Instead of Polling

Instead of frequent polling, configure GitHub webhooks to notify Flux when changes occur. This eliminates unnecessary Git fetch operations.

Deploy a Flux notification receiver:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-webhook
  namespace: flux-system
spec:
  type: github
  events:
    - "ping"
    - "push"
  secretRef:
    # Shared secret for HMAC validation of webhook payloads
    name: webhook-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: my-app
```

Create the webhook secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: webhook-token
  namespace: flux-system
type: Opaque
stringData:
  token: your-webhook-shared-secret
```

Retrieve the webhook URL and configure it in GitHub:

```bash
# Get the webhook URL from the Receiver status
kubectl get receiver github-webhook -n flux-system -o jsonpath='{.status.webhookPath}'

# The full URL will be: https://your-flux-domain<webhook-path>
```

With webhooks in place, you can safely set a much longer polling interval as a fallback:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  # Long interval since webhooks handle immediate updates
  interval: 60m
  url: https://github.com/your-org/my-app.git
  ref:
    branch: main
  secretRef:
    name: github-token
```

## Step 5: Use SSH Instead of HTTPS

SSH-based Git operations do not consume GitHub REST API rate limits. They use a separate connection mechanism.

Create an SSH key secret:

```bash
# Generate a deploy key
ssh-keygen -t ed25519 -f flux-deploy-key -N "" -C "flux"

# Create the Kubernetes secret
ssh-keyscan github.com > known_hosts
kubectl create secret generic github-ssh \
  --from-file=identity=./flux-deploy-key \
  --from-file=known_hosts=./known_hosts \
  --namespace=flux-system
```

Use SSH URL in the GitRepository:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app-ssh
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://git@github.com/your-org/my-app.git
  ref:
    branch: main
  secretRef:
    name: github-ssh
```

## Step 6: Monitor Your Rate Limit Usage

Track your GitHub API rate limit consumption to catch issues before they cause failures.

Check your current rate limit status:

```bash
# Check rate limit for your token
curl -s -H "Authorization: token ghp_your_token" \
  https://api.github.com/rate_limit | jq '.rate'
```

## A Strategy for Large-Scale Deployments

For organizations with dozens or hundreds of repositories, combine multiple strategies:

1. **Authenticate everything** -- never leave GitRepository resources unauthenticated
2. **Use webhooks** for repositories that need fast response times
3. **Set long intervals** (30m-60m) for stable infrastructure repos
4. **Use SSH** for repositories where HTTPS rate limits are a concern
5. **Consolidate repositories** -- use monorepos with path-based Kustomizations instead of many small repos

## Summary

GitHub rate limiting is a common challenge when scaling Flux CD. The most effective mitigations are authenticating all Git operations, reducing polling frequency with longer intervals, and switching to webhook-driven reconciliation. For large deployments, combining SSH access with webhooks and extended intervals keeps you well within GitHub's limits while maintaining responsive GitOps workflows.

# How to Fix Flux CD Source Not Updating After Git Push

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitRepository, Kubernetes, Troubleshooting, GitOps, Webhooks, Reconciliation, Source Controller

Description: A practical guide to fixing Flux CD when it does not pick up new Git commits after pushing, covering reconciliation intervals, webhook configuration, caching issues, and manual force reconciliation.

---

## Introduction

One of the most frustrating experiences with Flux CD is pushing a commit to your Git repository and waiting for the changes to appear in your cluster, only to find that nothing happens. Flux CD polls Git repositories at a configured interval, and several factors can prevent it from detecting new commits promptly.

This guide covers all the common reasons why Flux CD does not update after a Git push and how to fix each one.

## Understanding How Flux Detects Changes

Flux CD's source-controller periodically fetches the Git repository and checks for new commits. The process works as follows:

1. The source-controller polls the Git repository at the configured `interval`
2. If a new commit is detected, it creates a new artifact
3. The kustomize-controller or helm-controller detects the new artifact
4. Reconciliation is triggered with the updated source

```bash
# Check the current revision Flux has fetched
kubectl get gitrepository -n flux-system flux-system -o jsonpath='{.status.artifact.revision}'

# Compare with the latest commit in your repository
git log --oneline -1 origin/main
```

## Common Cause 1: Reconciliation Interval Not Elapsed

The most common reason is simply that the reconciliation interval has not elapsed since your push.

### Diagnosing the Issue

```bash
# Check the configured interval
kubectl get gitrepository -n flux-system flux-system -o jsonpath='{.spec.interval}'

# Check when the last reconciliation happened
kubectl get gitrepository -n flux-system flux-system -o jsonpath='{.status.conditions[0].lastTransitionTime}'
```

### Fix: Force Immediate Reconciliation

```bash
# Force the source-controller to fetch immediately
flux reconcile source git flux-system -n flux-system

# Verify the new revision was fetched
kubectl get gitrepository -n flux-system flux-system
```

### Fix: Reduce the Polling Interval

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  # Reduce interval for faster detection of changes
  interval: 1m
  url: https://github.com/myorg/fleet-infra.git
  ref:
    branch: main
```

## Common Cause 2: No Webhook Configured

Without a webhook, Flux relies entirely on polling. For faster response times, configure a webhook so that your Git provider notifies Flux immediately when a push occurs.

### Setting Up a GitHub Webhook Receiver

```yaml
---
# Step 1: Create a Secret for webhook token validation
apiVersion: v1
kind: Secret
metadata:
  name: github-webhook-token
  namespace: flux-system
type: Opaque
stringData:
  token: your-random-webhook-secret-token
---
# Step 2: Create a Receiver that listens for GitHub push events
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-receiver
  namespace: flux-system
spec:
  type: github
  # Events to listen for
  events:
    - "ping"
    - "push"
  secretRef:
    name: github-webhook-token
  resources:
    # Which GitRepository to trigger reconciliation for
    - kind: GitRepository
      name: flux-system
      namespace: flux-system
```

```bash
# Step 3: Get the webhook URL to configure in GitHub
kubectl get receiver -n flux-system github-receiver -o jsonpath='{.status.webhookPath}'

# The full URL will be:
# https://<your-flux-webhook-domain><webhook-path>
```

### Exposing the Webhook Endpoint

```yaml
# Create an Ingress for the notification-controller webhook
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-webhook
  namespace: flux-system
  annotations:
    # Adjust annotations for your ingress controller
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  rules:
    - host: flux-webhook.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: notification-controller
                port:
                  number: 80
  tls:
    - hosts:
        - flux-webhook.example.com
      secretName: flux-webhook-tls
```

### Setting Up a GitLab Webhook Receiver

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gitlab-receiver
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
      name: flux-system
      namespace: flux-system
```

## Common Cause 3: Authentication Issues

If the Git credentials have expired or been rotated, the source-controller will fail to fetch updates silently or with errors.

### Diagnosing the Issue

```bash
# Check the GitRepository status for auth errors
kubectl get gitrepository -n flux-system flux-system -o yaml | grep -A 10 "conditions:"

# Check source-controller logs for authentication failures
kubectl logs -n flux-system deploy/source-controller --tail=50 | grep -i "auth\|denied\|forbidden\|401\|403"
```

### Fix: Update Git Credentials

```bash
# For HTTPS credentials, update the secret
kubectl create secret generic flux-system \
  -n flux-system \
  --from-literal=username=git \
  --from-literal=password=<new-personal-access-token> \
  --dry-run=client -o yaml | kubectl apply -f -

# Force reconciliation after updating credentials
flux reconcile source git flux-system -n flux-system
```

```yaml
# For SSH key authentication, update the SSH key secret
apiVersion: v1
kind: Secret
metadata:
  name: flux-system
  namespace: flux-system
type: Opaque
stringData:
  identity: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    <your-new-ssh-private-key>
    -----END OPENSSH PRIVATE KEY-----
  known_hosts: |
    github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl
```

## Common Cause 4: Wrong Branch or Tag Reference

If the GitRepository references a branch or tag that does not match where you pushed your changes, Flux will not detect the update.

### Diagnosing the Issue

```bash
# Check which ref the GitRepository is tracking
kubectl get gitrepository -n flux-system flux-system -o jsonpath='{.spec.ref}'
```

### Fix: Verify the Reference

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/myorg/fleet-infra.git
  ref:
    # Make sure this matches the branch you are pushing to
    branch: main
```

## Common Cause 5: Source Controller Pod Not Running

If the source-controller pod is crashed, restarting, or not scheduled, no source updates will be processed.

### Diagnosing the Issue

```bash
# Check if the source-controller is running
kubectl get pods -n flux-system -l app=source-controller

# Check for pod issues
kubectl describe pod -n flux-system -l app=source-controller
```

### Fix: Restart the Source Controller

```bash
# Restart the source-controller deployment
kubectl rollout restart deployment/source-controller -n flux-system

# Wait for rollout to complete
kubectl rollout status deployment/source-controller -n flux-system
```

## Common Cause 6: Git Repository URL Changed

If the repository URL changes (e.g., organization rename), Flux will fail to fetch.

### Diagnosing the Issue

```bash
# Check the configured URL
kubectl get gitrepository -n flux-system flux-system -o jsonpath='{.spec.url}'

# Try cloning manually to verify the URL works
git ls-remote https://github.com/myorg/fleet-infra.git
```

### Fix: Update the Repository URL

```bash
# Patch the GitRepository with the new URL
kubectl patch gitrepository flux-system -n flux-system \
  --type merge \
  -p '{"spec":{"url":"https://github.com/neworg/fleet-infra.git"}}'

# Force reconciliation
flux reconcile source git flux-system -n flux-system
```

## Common Cause 7: Kustomization Not Triggering After Source Update

Sometimes the source updates correctly but the Kustomization does not trigger.

### Diagnosing the Issue

```bash
# Compare source revision with Kustomization's last applied revision
echo "Source: $(kubectl get gitrepository -n flux-system flux-system -o jsonpath='{.status.artifact.revision}')"
echo "Kustomization: $(kubectl get kustomization -n flux-system flux-system -o jsonpath='{.status.lastAppliedRevision}')"
```

### Fix: Force Kustomization Reconciliation

```bash
# Force reconciliation of the Kustomization with its source
flux reconcile kustomization flux-system -n flux-system --with-source
```

## Complete Debugging Workflow

```bash
# Step 1: Check if the push reached the remote
git log --oneline origin/main -1

# Step 2: Check if source-controller has the latest revision
kubectl get gitrepository -n flux-system flux-system

# Step 3: If source is behind, force reconciliation
flux reconcile source git flux-system -n flux-system

# Step 4: Check source-controller logs
kubectl logs -n flux-system deploy/source-controller --tail=50

# Step 5: Check if the Kustomization has applied the new revision
kubectl get kustomization -n flux-system

# Step 6: If Kustomization is behind, force reconciliation
flux reconcile kustomization flux-system -n flux-system

# Step 7: Check kustomize-controller logs
kubectl logs -n flux-system deploy/kustomize-controller --tail=50

# Step 8: Verify the changes are applied in the cluster
kubectl get <resource> -n <namespace> -o yaml
```

## Conclusion

When Flux CD does not update after a Git push, the issue is usually one of: the polling interval has not elapsed, no webhook is configured for instant notification, authentication credentials have expired, or the wrong branch is being tracked. Start by forcing a manual reconciliation with `flux reconcile source git` to confirm the system works. For production environments, always configure webhooks for near-instant detection of Git changes. Monitor the source-controller logs and GitRepository status conditions to catch authentication and connectivity issues early.

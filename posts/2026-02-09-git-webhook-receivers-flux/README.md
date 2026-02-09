# How to Set Up Git Webhook Receivers for Immediate Flux Reconciliation on Push

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flux, GitOps, Webhooks, GitHub, GitLab

Description: Learn how to configure Git webhook receivers in Flux to trigger immediate reconciliation when you push commits instead of waiting for the polling interval.

---

By default, Flux polls Git repositories every few minutes to detect changes. For development environments or time-sensitive deployments, this delay is frustrating. Git webhook receivers solve this by triggering Flux reconciliation immediately when you push commits. Your changes deploy within seconds instead of minutes.

This guide shows you how to set up webhook receivers for GitHub, GitLab, and other Git providers with Flux.

## How Webhook Receivers Work

The flow is simple:

1. You push commits to Git
2. Git provider sends webhook notification to Flux
3. Flux webhook receiver validates the request
4. Flux immediately reconciles the GitRepository
5. Changed Kustomizations update within seconds

Instead of polling every 5 minutes, deployments happen instantly.

## Installing the Notification Controller

Flux's notification controller handles webhooks. It should already be installed if you bootstrapped with `flux bootstrap`:

```bash
kubectl get deployment notification-controller -n flux-system
```

If not, install it:

```bash
flux install --components=notification-controller
```

## Creating a Webhook Receiver

Define a Receiver resource:

```yaml
# flux-system/receiver.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - ping
    - push
  secretRef:
    name: webhook-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: flux-system
```

This creates a receiver that listens for GitHub push events and reconciles the flux-system GitRepository.

## Generating a Webhook Secret

Create a random token for webhook authentication:

```bash
# Generate token
TOKEN=$(head -c 12 /dev/urandom | shasum | cut -d ' ' -f1)

# Create Kubernetes secret
kubectl create secret generic webhook-token \
  --namespace=flux-system \
  --from-literal=token=$TOKEN

# Save token for later
echo $TOKEN > webhook-token.txt
```

## Exposing the Receiver

The notification controller needs to be accessible from the internet. Use an Ingress:

```yaml
# flux-system/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-receiver
  namespace: flux-system
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - flux.yourdomain.com
    secretName: flux-receiver-tls
  rules:
  - host: flux.yourdomain.com
    http:
      paths:
      - path: /hook/
        pathType: Prefix
        backend:
          service:
            name: notification-controller
            port:
              number: 80
```

Apply and get the webhook URL:

```bash
kubectl apply -f flux-system/ingress.yaml

# Get the receiver path
kubectl get receiver github-receiver -n flux-system -o jsonpath='{.status.webhookPath}'
```

You'll see something like:

```
/hook/6d1d7f8e9c0b1a2b3c4d5e6f7a8b9c0d
```

Your full webhook URL is:

```
https://flux.yourdomain.com/hook/6d1d7f8e9c0b1a2b3c4d5e6f7a8b9c0d
```

## Configuring GitHub Webhook

In your GitHub repository:

1. Go to Settings → Webhooks → Add webhook
2. Payload URL: `https://flux.yourdomain.com/hook/6d1d7f8e9c0b1a2b3c4d5e6f7a8b9c0d`
3. Content type: `application/json`
4. Secret: Enter the token from `webhook-token.txt`
5. Events: Select "Just the push event"
6. Active: Check
7. Click "Add webhook"

Test the webhook by clicking "Redeliver" next to a recent delivery. Check the response shows a 200 status.

## Configuring GitLab Webhook

For GitLab repositories:

```yaml
# flux-system/receiver-gitlab.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gitlab-receiver
  namespace: flux-system
spec:
  type: gitlab
  events:
    - push
    - tag_push
  secretRef:
    name: webhook-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: flux-system
```

In GitLab:

1. Go to Settings → Webhooks
2. URL: `https://flux.yourdomain.com/hook/<path>`
3. Secret Token: Enter the webhook token
4. Trigger: Check "Push events"
5. Click "Add webhook"
6. Test with "Push events" button

## Multiple Repository Support

Create receivers for different repositories:

```yaml
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: apps-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - push
  secretRef:
    name: webhook-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: apps
      namespace: flux-system
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: infrastructure-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - push
  secretRef:
    name: webhook-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: infrastructure
      namespace: flux-system
```

Each receiver gets its own webhook path. Configure separate webhooks in GitHub for each repository.

## Triggering Kustomization Reconciliation

Receivers trigger GitRepository reconciliation. To reconcile Kustomizations immediately, they must depend on the GitRepository:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps
  prune: true
```

When the GitRepository updates, dependent Kustomizations reconcile automatically.

## Branch and Tag Filtering

Reconcile only on specific branches:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/yourorg/fleet-infra
  ref:
    branch: main
  secretRef:
    name: flux-system
  ignore: |
    # exclude all
    /*
    # include deploy dir
    !/apps/
```

Webhooks for non-main branches won't trigger reconciliation.

For tag-based deployments:

```yaml
spec:
  ref:
    tag: v1.*
```

## Verifying Webhook Deliveries

Check receiver status:

```bash
kubectl describe receiver github-receiver -n flux-system
```

View notification controller logs:

```bash
kubectl logs -n flux-system deploy/notification-controller -f
```

You'll see webhook events:

```
Handling request from GitHub for flux-system/flux-system
Triggering reconciliation for GitRepository/flux-system/flux-system
```

Check GitRepository for recent reconciliation:

```bash
kubectl get gitrepository flux-system -n flux-system
```

Look at the "Last Update" timestamp. It should match when you pushed.

## Security Considerations

Protect your webhook receiver:

1. **Always use HTTPS**: Never expose webhooks over HTTP
2. **Validate webhook secrets**: Required for authentication
3. **Limit network access**: Use network policies if possible
4. **Rotate tokens regularly**: Update secrets every 90 days
5. **Monitor failed deliveries**: Alert on repeated failures

Network policy example:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: notification-controller
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: notification-controller
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 9292
```

## Alternative: Generic Webhooks

For Git providers without native support:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: generic-receiver
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: webhook-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: flux-system
```

Send a POST request to trigger:

```bash
curl -X POST https://flux.yourdomain.com/hook/<path> \
  -H "X-Signature: sha1=$(echo -n '<path>' | openssl sha1 -hmac '<token>' | cut -d' ' -f2)"
```

## Webhook for Specific Paths

Reconcile only when specific paths change using commit message filters:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  url: https://github.com/yourorg/fleet-infra
  ref:
    branch: main
  ignore: |
    /*
    !/apps/production/
```

This limits reconciliation to changes in the apps/production/ directory.

## Debugging Failed Webhooks

Common issues:

**Webhook not triggering:**
- Check receiver status: `kubectl get receiver -n flux-system`
- Verify ingress routes to notification-controller
- Check notification-controller logs
- Test webhook manually from Git provider

**Authentication failures:**
- Verify webhook secret matches Kubernetes secret
- Check for trailing whitespace in tokens
- Ensure secret is in correct namespace

**Wrong resources reconciling:**
- Verify receiver targets correct GitRepository
- Check GitRepository name matches

## Performance Considerations

Webhooks trigger immediate reconciliation, which can cause:

- Increased API server load if pushing frequently
- Higher memory usage for large repositories
- Multiple Kustomizations reconciling simultaneously

Mitigate with:

```yaml
spec:
  interval: 10m  # Still poll occasionally as backup
  retryInterval: 5m  # Don't retry too aggressively
```

## Best Practices

1. **Use webhooks for dev/staging**: Immediate feedback during development
2. **Consider polling for production**: More predictable resource usage
3. **Multiple receivers**: Separate webhooks for different repo paths
4. **Monitor delivery failures**: Set up alerts for webhook issues
5. **Document webhook URLs**: Team needs to know what's configured
6. **Test after setup**: Push a change and verify immediate reconciliation
7. **Keep secrets secure**: Store webhook tokens in password managers

## Conclusion

Git webhook receivers transform Flux from poll-based to event-driven reconciliation. Your changes deploy within seconds of pushing to Git, dramatically improving development velocity. Set up receivers for development environments where speed matters, while keeping predictable polling intervals for production. The webhook architecture scales to hundreds of repositories without increasing Flux's resource footprint.

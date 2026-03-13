# How to Fix Flux CD Notification Provider Not Sending Alerts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Notifications, Alerts, GitOps, Kubernetes, Troubleshooting, Slack, Webhooks

Description: A step-by-step troubleshooting guide for fixing Flux CD notification providers that fail to deliver alerts to Slack, Teams, or other webhook endpoints.

---

Flux CD includes a powerful notification system that can send alerts when reconciliation events occur. When notifications stop arriving, it can leave you blind to deployment failures. This guide covers how to diagnose and fix notification delivery issues.

## Understanding Flux CD Notifications

Flux CD notifications rely on two custom resources:

1. **Provider** - defines the destination (Slack, Teams, Discord, generic webhook, etc.)
2. **Alert** - defines what events to send and which resources to watch

Both must be correctly configured and healthy for notifications to flow.

## Step 1: Check Provider Status

Start by verifying that the Provider resource is healthy.

```bash
# List all providers
kubectl get providers -A

# Describe a specific provider for detailed status
kubectl describe provider slack-provider -n flux-system
```

A healthy Provider should show `Ready: True` in its conditions.

```yaml
# Example Slack Provider configuration
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-provider
  namespace: flux-system
spec:
  # The notification channel type
  type: slack
  # Reference to a secret containing the webhook URL
  secretRef:
    name: slack-webhook-url
```

## Step 2: Verify the Webhook Secret

The most common cause of notification failure is an incorrect or missing webhook URL secret.

```bash
# Check that the secret exists
kubectl get secret slack-webhook-url -n flux-system

# Verify the secret has the correct key
kubectl get secret slack-webhook-url -n flux-system \
  -o jsonpath='{.data.address}' | base64 -d
```

The secret must have a key called `address` containing the full webhook URL:

```yaml
# Correct secret format for a Slack provider
apiVersion: v1
kind: Secret
metadata:
  name: slack-webhook-url
  namespace: flux-system
type: Opaque
stringData:
  # The key MUST be "address"
  address: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
```

Common mistakes with the secret:

```bash
# Wrong key name - "url" instead of "address"
# This will NOT work:
#   url: https://hooks.slack.com/services/...
# It MUST be:
#   address: https://hooks.slack.com/services/...

# Verify the key name
kubectl get secret slack-webhook-url -n flux-system -o json | \
  python3 -c "import sys,json; print(list(json.loads(sys.stdin.read())['data'].keys()))"
```

## Step 3: Verify Alert Configuration

The Alert resource controls which events are forwarded to the Provider.

```yaml
# Example Alert configuration
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: on-call-alerts
  namespace: flux-system
spec:
  # Reference to the Provider
  providerRef:
    name: slack-provider
  # Event severity filter: info, error, or both
  eventSeverity: error
  # Which resources to watch
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
    - kind: GitRepository
      name: "*"
      namespace: flux-system
```

Check the Alert status:

```bash
# List all alerts and their readiness
kubectl get alerts -A

# Get detailed alert status
kubectl describe alert on-call-alerts -n flux-system

# Check for condition errors
kubectl get alert on-call-alerts -n flux-system \
  -o jsonpath='{.status.conditions[*].message}'
```

## Step 4: Verify Event Severity Filtering

A very common issue is filtering out the events you actually want to receive.

```yaml
# This only sends error events - you will miss successful deployments
spec:
  eventSeverity: error

# This sends both info and error events
spec:
  eventSeverity: info
```

If you are expecting notifications for successful reconciliations but only have `eventSeverity: error`, you will never receive them.

## Step 5: Verify Event Sources Match

The `eventSources` field must match the actual resources you want to monitor. Namespace mismatches are a frequent culprit.

```yaml
spec:
  eventSources:
    # Watch all Kustomizations in flux-system namespace
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    # Watch a specific HelmRelease in a different namespace
    - kind: HelmRelease
      name: my-app
      namespace: apps
    # Watch all GitRepositories across all namespaces
    - kind: GitRepository
      name: "*"
      namespace: "*"
```

```bash
# Verify the namespaces of your source resources
kubectl get kustomizations -A
kubectl get helmreleases -A
kubectl get gitrepositories -A

# Make sure Alert eventSources namespaces match
```

## Step 6: Check the Notification Controller Logs

The notification-controller logs show exactly what is happening with event delivery.

```bash
# View notification controller logs
kubectl logs -n flux-system deployment/notification-controller

# Filter for delivery errors
kubectl logs -n flux-system deployment/notification-controller | grep -i error

# Watch logs in real-time during a reconciliation
kubectl logs -n flux-system deployment/notification-controller -f
```

Common error messages:

```bash
# "failed to send notification" - webhook URL unreachable
# Fix: Check network connectivity and webhook URL validity

# "provider not ready" - Provider resource has errors
# Fix: Check Provider status conditions

# "secret not found" - webhook secret missing
# Fix: Create the secret in the correct namespace
```

## Step 7: Test Webhook Connectivity

Verify that the notification controller can reach the webhook endpoint.

```bash
# Get the webhook URL from the secret
WEBHOOK_URL=$(kubectl get secret slack-webhook-url -n flux-system \
  -o jsonpath='{.data.address}' | base64 -d)

# Test connectivity from inside the cluster
kubectl run -n flux-system curl-test --rm -it --restart=Never \
  --image=curlimages/curl -- \
  curl -s -o /dev/null -w "%{http_code}" \
  -X POST -H "Content-Type: application/json" \
  -d '{"text":"Flux CD test notification"}' \
  "$WEBHOOK_URL"

# A 200 response means the webhook is reachable
```

## Step 8: Provider-Specific Configuration

### Slack

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  # Optional: specify a channel (overrides webhook default)
  channel: "#flux-alerts"
  secretRef:
    name: slack-webhook-url
```

### Microsoft Teams

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: teams
  namespace: flux-system
spec:
  type: msteams
  secretRef:
    name: teams-webhook-url
```

### Generic Webhook

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: generic-webhook
  namespace: flux-system
spec:
  type: generic
  # Optional: custom headers via secret
  secretRef:
    name: webhook-secret
---
# Secret with address and optional headers
apiVersion: v1
kind: Secret
metadata:
  name: webhook-secret
  namespace: flux-system
type: Opaque
stringData:
  address: "https://my-api.example.com/webhook"
  headers: |
    Authorization: Bearer my-token
    X-Custom-Header: flux-notification
```

## Step 9: Exclude Noisy Events

If notifications are partially working but you are missing specific events, check for exclusion rules.

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: filtered-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  # Exclude events that match these labels
  exclusionList:
    # Skip events with "no changes" in the message
    - "no changes"
    # Skip health check events
    - "health check"
  eventSources:
    - kind: Kustomization
      name: "*"
```

## Step 10: Force a Test Notification

Trigger a reconciliation event to test the notification pipeline end-to-end.

```bash
# Suspend and resume a resource to trigger an event
flux suspend kustomization flux-system
flux resume kustomization flux-system

# Or force a reconciliation
flux reconcile kustomization flux-system --with-source

# Watch the notification controller logs during this process
kubectl logs -n flux-system deployment/notification-controller -f
```

## Step 11: Full Debugging Checklist

```bash
# 1. Provider is ready
kubectl get providers -n flux-system

# 2. Alert is ready
kubectl get alerts -n flux-system

# 3. Secret exists with correct key
kubectl get secret slack-webhook-url -n flux-system \
  -o jsonpath='{.data.address}' | base64 -d

# 4. Notification controller is running
kubectl get deployment notification-controller -n flux-system

# 5. Check controller logs for errors
kubectl logs -n flux-system deployment/notification-controller --tail=50

# 6. Verify event sources match actual resources
kubectl get kustomizations -A
kubectl get helmreleases -A

# 7. Test webhook connectivity from inside the cluster
kubectl run curl-test -n flux-system --rm -it --restart=Never \
  --image=curlimages/curl -- curl -s -o /dev/null \
  -w "%{http_code}" "YOUR_WEBHOOK_URL"
```

## Summary

When Flux CD notifications are not sending alerts, the root cause is usually one of these:

- **Wrong secret key name** - must be `address`, not `url` or `webhook`
- **Webhook URL unreachable** - network policies or firewall blocking egress
- **Event severity mismatch** - filtering out the events you want to receive
- **Namespace mismatch** in event sources - Alert watches wrong namespace
- **Provider not ready** - secret reference or type misconfigured

Check the notification-controller logs first, as they will point you directly to the issue in most cases.

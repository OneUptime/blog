# How to Test Flux Notification Provider Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, Testing, Provider

Description: Learn how to test and validate your Flux notification provider configuration to ensure alerts are delivered correctly.

---

After setting up a notification provider in Flux, you need to verify that it is correctly configured and can successfully deliver notifications. Testing early prevents surprises when real alerts need to be sent. This guide covers practical methods to test your Flux notification provider configuration.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- A notification provider resource configured (Slack, Teams, webhook, etc.)
- kubectl access to the cluster

## Step 1: Verify the Provider Resource

Start by checking that the provider resource exists and has the correct configuration.

```bash
# List all providers in the flux-system namespace
kubectl get providers -n flux-system

# View the full provider configuration
kubectl get provider slack-provider -n flux-system -o yaml

# Check provider status
kubectl describe provider slack-provider -n flux-system
```

## Step 2: Verify the Provider Secret

Ensure the secret referenced by the provider contains the correct data.

```bash
# Check the secret exists
kubectl get secret slack-webhook-url -n flux-system

# Verify the secret has the expected keys
kubectl get secret slack-webhook-url -n flux-system -o json | jq '.data | keys'

# Decode the secret value to verify correctness (handle with care)
kubectl get secret slack-webhook-url -n flux-system -o jsonpath='{.data.address}' | base64 -d
echo ""
```

## Step 3: Create a Test Alert

Create a simple alert that watches all Kustomization events with info severity. This will capture the most events for testing.

```yaml
# Test alert to verify notification delivery
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: test-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  # Use info to capture all events
  eventSeverity: info
  # Watch all Kustomizations to maximize event coverage
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
```

Apply the test alert.

```bash
# Apply the test alert
kubectl apply -f test-alert.yaml

# Verify it was created
kubectl get alert test-alert -n flux-system
```

## Step 4: Trigger an Event

Force a reconciliation to generate an event that should trigger the alert.

```bash
# Trigger a Kustomization reconciliation
flux reconcile kustomization flux-system --with-source

# Or trigger a specific resource
flux reconcile source git flux-system
```

## Step 5: Monitor the Notification Controller

Watch the notification controller logs to see if the event is being processed and the notification is being sent.

```bash
# Watch logs in real-time
kubectl logs -n flux-system deploy/notification-controller -f

# Look for specific delivery messages
kubectl logs -n flux-system deploy/notification-controller | grep -i "dispatch\|send\|post\|deliver"

# Check for errors
kubectl logs -n flux-system deploy/notification-controller | grep -i "error\|fail"
```

## Step 6: Test Provider Connectivity from the Cluster

Test that the notification controller can reach the provider endpoint.

```bash
# Test connectivity to Slack webhook endpoint
kubectl run provider-test --image=curlimages/curl --rm -it -- \
  curl -X POST -H "Content-Type: application/json" \
  -d '{"text":"Flux notification test"}' \
  "https://hooks.slack.com/services/T00/B00/xxxx" \
  -w "\nHTTP Status: %{http_code}\n"

# Test connectivity to a generic webhook endpoint
kubectl run provider-test --image=curlimages/curl --rm -it -- \
  curl -X POST -H "Content-Type: application/json" \
  -d '{"text":"test"}' \
  "https://your-webhook.example.com/endpoint" \
  -w "\nHTTP Status: %{http_code}\n"
```

## Step 7: Test with Multiple Providers

If you have multiple providers, create test alerts for each one.

```yaml
# Test alert for Slack provider
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: test-slack
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: GitRepository
      name: flux-system
      namespace: flux-system
---
# Test alert for Teams provider
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: test-teams
  namespace: flux-system
spec:
  providerRef:
    name: teams-provider
  eventSeverity: info
  eventSources:
    - kind: GitRepository
      name: flux-system
      namespace: flux-system
```

Trigger a reconciliation and check if both providers receive notifications.

```bash
# Apply both test alerts
kubectl apply -f test-multi-provider.yaml

# Trigger an event
flux reconcile source git flux-system

# Check logs for both deliveries
kubectl logs -n flux-system deploy/notification-controller --tail=30
```

## Step 8: Validate Alert Delivery End-to-End

Perform a complete end-to-end test by making a real change that generates an event.

```bash
# 1. Check current source revision
kubectl get gitrepository flux-system -n flux-system -o jsonpath='{.status.artifact.revision}'

# 2. Push a change to your Git repository (make a minor change)
# This should generate a GitRepository event followed by a Kustomization event

# 3. Monitor for the event
kubectl get events -n flux-system --watch

# 4. Check notification controller logs for delivery confirmation
kubectl logs -n flux-system deploy/notification-controller --tail=20
```

## Step 9: Clean Up Test Resources

After verifying that notifications are working, remove the test alert.

```bash
# Delete the test alert
kubectl delete alert test-alert -n flux-system

# Verify it was removed
kubectl get alerts -n flux-system
```

## Common Test Failures and Solutions

| Test Result | Issue | Solution |
|---|---|---|
| No events generated | No changes to reconcile | Make a commit or force reconciliation |
| Events seen but no notification | Provider unreachable | Test connectivity from within the cluster |
| HTTP 400 from provider | Malformed payload | Check provider type matches the endpoint |
| HTTP 401/403 from provider | Invalid credentials | Update the provider secret |
| HTTP 404 from provider | Wrong URL | Verify the webhook URL in the secret |
| Notification sent but not received | Channel/routing issue | Check the provider channel/routing configuration |

## Provider-Specific Testing Tips

For Slack, check:
- The webhook URL is valid and the Slack app is installed in the workspace
- The channel specified in the provider exists

For Microsoft Teams, check:
- The incoming webhook connector is configured in the correct channel
- The webhook URL has not been regenerated

For generic webhooks, check:
- The endpoint accepts POST requests with JSON payloads
- The endpoint returns a 2xx status code

## Summary

Testing your Flux notification provider configuration is a straightforward process: verify the provider and secret exist, create a test alert, trigger an event, and check the notification controller logs for delivery confirmation. Testing connectivity from within the cluster is essential because network policies and DNS resolution may differ from external access. Always clean up test resources after validation to avoid unnecessary notifications in production.

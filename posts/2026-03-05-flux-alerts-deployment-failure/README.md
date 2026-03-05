# How to Configure Flux Alerts for Deployment Failure Notifications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, Alerts, Deployment, Failure

Description: Learn how to configure Flux alerts that notify you immediately when deployments fail, enabling rapid incident response.

---

Deployment failures require immediate attention. Flux CD allows you to configure alerts that trigger notifications the moment a reconciliation fails, a health check does not pass, or a Helm upgrade errors out. This guide covers how to set up error-focused alerts for deployment failure notifications.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- A notification provider configured (Slack, PagerDuty, webhook, etc.)
- Kustomization or HelmRelease resources deployed

## Why Failure Alerts Matter

In a GitOps workflow, failed deployments can go unnoticed if you rely solely on periodic checks. Flux error events fire when reconciliations fail, health checks do not pass, or dependencies cannot be resolved. Configuring error-level alerts ensures your team is notified immediately when something goes wrong.

## Step 1: Create an Error-Only Alert

The most direct way to capture failure notifications is to set `eventSeverity` to `error`.

```yaml
# Alert that only captures deployment failures
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: deployment-failure-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-alerts
  # Only capture error events (failures)
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
```

Apply the alert.

```bash
# Apply the failure alert
kubectl apply -f failure-alert.yaml
```

## Step 2: Create Failure Alerts for Production

For production environments, route failure alerts to a high-priority channel or paging system.

```yaml
# Production failure alert routed to a critical channel
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: production-failure-alert
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty-provider
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: production
    - kind: HelmRelease
      name: "*"
      namespace: production
```

## Step 3: Monitor Both Source and Deployment Failures

Source fetch failures (Git clone errors, authentication issues) can cause downstream deployment failures. Include source resources in your alert.

```yaml
# Alert covering both source and deployment failures
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: full-pipeline-failure-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-critical
  eventSeverity: error
  eventSources:
    # Source failures
    - kind: GitRepository
      name: "*"
      namespace: flux-system
    - kind: HelmRepository
      name: "*"
      namespace: flux-system
    # Deployment failures
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
```

## Step 4: Critical Application Failure Alerts

For mission-critical applications, create targeted failure alerts.

```yaml
# Failure alert for critical services
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: critical-service-failures
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty-provider
  eventSeverity: error
  eventSources:
    - kind: HelmRelease
      name: payment-gateway
      namespace: production
    - kind: HelmRelease
      name: auth-service
      namespace: production
    - kind: Kustomization
      name: core-infrastructure
      namespace: flux-system
```

## Step 5: Multi-Environment Failure Alerts

Send failure alerts from different environments to different channels.

```yaml
# Staging failure alert (lower priority)
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: staging-failure-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-staging
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: staging
    - kind: HelmRelease
      name: "*"
      namespace: staging
---
# Production failure alert (high priority)
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: prod-failure-alert
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty-provider
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: production
    - kind: HelmRelease
      name: "*"
      namespace: production
```

## Step 6: Test the Failure Alert

You can test failure alerts by intentionally introducing an error.

```bash
# Create a Kustomization pointing to a non-existent path to trigger a failure
flux create kustomization test-failure \
  --source=GitRepository/flux-system \
  --path="./nonexistent-path" \
  --prune=true

# Watch for the failure event
kubectl get events -n flux-system --watch

# Check notification controller logs for delivery
kubectl logs -n flux-system deploy/notification-controller --tail=20

# Clean up the test resource
flux delete kustomization test-failure
```

## Step 7: Verify Alert Configuration

Confirm your failure alerts are properly configured.

```bash
# List all alerts
kubectl get alerts -n flux-system

# Check specific alert details
kubectl describe alert deployment-failure-alert -n flux-system

# Verify the alert is not suspended
kubectl get alert deployment-failure-alert -n flux-system -o jsonpath='{.spec.suspend}'
```

## Common Failure Event Types

Error events you will receive from Flux resources include:

- **Reconciliation failed** - The kustomize build or apply operation failed
- **Health check failed** - Post-deployment health checks did not pass within the timeout
- **Helm install/upgrade failed** - The Helm operation encountered an error
- **Helm rollback** - A failed upgrade triggered an automatic rollback
- **Source fetch failed** - Git clone, Helm chart download, or OCI pull failed
- **Dependency not ready** - A required dependency did not become ready in time
- **Validation failed** - Resource validation failed before apply

## Best Practices

1. **Always use error severity for failure alerts** to avoid noise from successful operations
2. **Route production failures to paging systems** like PagerDuty for immediate response
3. **Include source resources** in failure alerts to catch upstream issues
4. **Create separate alerts per environment** with appropriate urgency levels
5. **Never suspend failure alerts** in production unless during a planned maintenance window

## Summary

Configuring Flux alerts for deployment failures ensures your team is notified immediately when something goes wrong in your GitOps pipeline. By setting `eventSeverity` to `error`, you filter out all successful operations and focus only on failures. Route production failures to high-priority channels, include source resources for full pipeline coverage, and create environment-specific alerts with appropriate urgency levels.

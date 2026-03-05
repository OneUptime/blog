# How to Configure Alert Severity Levels in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, Alerts, Severity

Description: Learn how to use the eventSeverity field in Flux alerts to filter notifications by info and error severity levels.

---

Flux CD alerts support severity-based filtering through the `spec.eventSeverity` field. This allows you to control which events trigger notifications, helping you reduce noise and focus on what matters. This guide explains the available severity levels, how they work, and how to use them effectively in your alert configuration.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- A notification provider configured
- Flux resources generating events (Kustomizations, HelmReleases, GitRepositories, etc.)

## Understanding Severity Levels in Flux

The Flux Alert resource supports two severity levels in the `spec.eventSeverity` field:

- **info** - Captures both informational and error events. This is the broadest setting and includes everything.
- **error** - Captures only error events, filtering out informational messages about successful operations.

When you set `eventSeverity` to `info`, you receive all events. When you set it to `error`, you receive only events indicating failures. There is no separate `warning` level.

## Step 1: Create an Info-Level Alert

An info-level alert captures every event from the specified sources, including successful reconciliations, source updates, and errors.

```yaml
# Info-level alert that captures all events
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: all-events-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  # Capture all events including info and error
  eventSeverity: info
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

## Step 2: Create an Error-Only Alert

An error-level alert only fires when something goes wrong, making it ideal for on-call or pager integrations.

```yaml
# Error-only alert for critical failure notifications
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: errors-only-alert
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty-provider
  # Only capture error events
  eventSeverity: error
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

## Step 3: Use Multiple Alerts with Different Severity Levels

A common pattern is to create separate alerts for different severity levels, sending them to different providers or channels.

```yaml
# Info-level alert sent to a general Slack channel
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: info-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-general
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
---
# Error-level alert sent to a critical alerts channel
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: error-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-critical
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
```

Apply both alerts.

```bash
# Apply the multi-severity alert configuration
kubectl apply -f severity-alerts.yaml
```

## Step 4: Combine Severity Filtering with Exclusion Rules

You can further refine info-level alerts by adding exclusion rules that filter out specific event messages.

```yaml
# Info-level alert with exclusion rules to reduce noise
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: refined-info-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-provider
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
  # Exclude routine messages while keeping meaningful info events
  exclusionList:
    - "^Reconciliation finished.*no changes$"
    - "^no updates made$"
```

## Step 5: Environment-Based Severity Strategy

A practical approach is to vary severity levels based on the environment.

```yaml
# Development environment: info-level for visibility
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: dev-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-dev
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: dev
    - kind: HelmRelease
      name: "*"
      namespace: dev
---
# Production environment: error-only for actionable alerts
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: prod-error-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-prod-critical
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: production
    - kind: HelmRelease
      name: "*"
      namespace: production
```

## Step 6: Verify Severity Configuration

Check that your alerts are configured with the correct severity levels.

```bash
# List all alerts and their configurations
kubectl get alerts -n flux-system -o custom-columns=NAME:.metadata.name,SEVERITY:.spec.eventSeverity,PROVIDER:.spec.providerRef.name

# Check the detailed configuration of a specific alert
kubectl get alert errors-only-alert -n flux-system -o yaml
```

## How Severity Affects Event Delivery

Here is a summary of which events are delivered based on the severity setting:

| Event Type | eventSeverity: info | eventSeverity: error |
|---|---|---|
| Reconciliation succeeded | Delivered | Not delivered |
| Source updated | Delivered | Not delivered |
| Health check passed | Delivered | Not delivered |
| Reconciliation failed | Delivered | Delivered |
| Health check failed | Delivered | Delivered |
| Authentication error | Delivered | Delivered |

## Best Practices

1. **Start with info severity** during initial setup so you understand the event patterns in your cluster
2. **Switch to error severity** for production pager integrations to avoid alert fatigue
3. **Use separate alerts** for different severity levels, routing them to appropriate channels
4. **Combine severity with exclusion rules** when info severity is too broad but error severity is too narrow
5. **Review alert volume regularly** and adjust severity levels as your cluster evolves

## Summary

The `eventSeverity` field in Flux alerts provides a straightforward way to control notification volume. By setting it to `info`, you receive all events for full visibility. By setting it to `error`, you receive only failure notifications for focused alerting. Combining multiple alerts with different severity levels and routing them to different providers gives you a layered notification strategy that serves both operational awareness and incident response needs.

# How to Route Alerts to Different Channels Based on Severity in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, Alerts, Severity Routing

Description: Learn how to route Flux alerts to different notification channels based on event severity, sending errors to critical channels and info events to general channels.

---

Not all Flux events deserve the same level of attention. Informational events about successful deployments are useful for awareness, but error events about failed reconciliations need immediate action. By routing alerts to different channels based on severity, you ensure that critical failures reach the right people through high-priority channels while routine updates flow to general-purpose channels. This guide shows how to implement severity-based routing.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- Multiple notification providers or channels configured
- Flux resources generating both info and error events

## How Severity-Based Routing Works

Flux supports two severity levels in the `spec.eventSeverity` field: `info` (captures all events) and `error` (captures only error events). By creating multiple Alert resources with different severity levels pointing to different providers, you route events based on their severity.

## Step 1: Create Providers for Different Severity Levels

Set up separate providers for general and critical notification channels.

```yaml
# Provider for general informational notifications
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-general
  namespace: flux-system
spec:
  type: slack
  channel: flux-info
  secretRef:
    name: slack-webhook
---
# Provider for critical error notifications
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-critical
  namespace: flux-system
spec:
  type: slack
  channel: flux-critical
  secretRef:
    name: slack-webhook
---
# Provider for paging on critical failures
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: pagerduty-oncall
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: pagerduty-webhook
```

Apply the providers.

```bash
# Apply severity-based providers
kubectl apply -f severity-providers.yaml

# Verify providers
kubectl get providers -n flux-system
```

## Step 2: Create Severity-Based Alerts

Create separate alerts for info and error severity levels.

```yaml
# Info-level alert to general Slack channel
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: info-severity-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-general
  # Captures all events including successes
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
  # Filter noise from info events
  exclusionList:
    - "^Reconciliation finished.*no changes$"
    - "^stored artifact.*same revision$"
    - "^artifact up-to-date.*"
    - ".*is not ready$"
    - ".*waiting for.*"
---
# Error-level alert to critical Slack channel
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: error-severity-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-critical
  # Captures only error events
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
---
# Error-level alert to PagerDuty for on-call paging
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: pagerduty-error-alert
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty-oncall
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: production
    - kind: HelmRelease
      name: "*"
      namespace: production
```

Apply the alerts.

```bash
# Apply severity-based alerts
kubectl apply -f severity-alerts.yaml

# Verify alerts
kubectl get alerts -n flux-system -o custom-columns=NAME:.metadata.name,SEVERITY:.spec.eventSeverity,PROVIDER:.spec.providerRef.name
```

## Step 3: Environment-Specific Severity Routing

Vary severity routing based on the environment.

```yaml
# Development: info-level to dev channel (low priority)
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: dev-info-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-general
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: development
    - kind: HelmRelease
      name: "*"
      namespace: development
  exclusionList:
    - "^Reconciliation finished.*no changes$"
---
# Staging: error-only to staging channel (medium priority)
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: staging-error-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-general
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: staging
    - kind: HelmRelease
      name: "*"
      namespace: staging
---
# Production: error to critical channel AND PagerDuty (high priority)
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: prod-error-slack
  namespace: flux-system
spec:
  providerRef:
    name: slack-critical
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: production
    - kind: HelmRelease
      name: "*"
      namespace: production
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: prod-error-pagerduty
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty-oncall
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: production
    - kind: HelmRelease
      name: "*"
      namespace: production
```

## Step 4: Tiered Severity Routing

Create a three-tier routing strategy using info, filtered info, and error alerts.

```yaml
# Tier 1: All events to audit log (webhook)
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: audit-all-events
  namespace: flux-system
spec:
  providerRef:
    name: audit-webhook
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
---
# Tier 2: Meaningful info events to team channel
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: team-info-events
  namespace: flux-system
spec:
  providerRef:
    name: slack-general
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
  exclusionList:
    - "^Reconciliation finished.*no changes$"
    - "^stored artifact.*same revision$"
    - ".*is not ready$"
    - ".*waiting for.*"
    - ".*dependency.*"
---
# Tier 3: Errors to critical channel
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: critical-errors
  namespace: flux-system
spec:
  providerRef:
    name: slack-critical
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

## Step 5: Verify Severity Routing

Test that events are routed to the correct channels based on severity.

```bash
# List all alerts with severity and provider info
kubectl get alerts -n flux-system -o custom-columns=NAME:.metadata.name,SEVERITY:.spec.eventSeverity,PROVIDER:.spec.providerRef.name

# Trigger a successful reconciliation (generates info event)
flux reconcile kustomization flux-system --with-source

# Check notification controller logs
kubectl logs -n flux-system deploy/notification-controller --tail=30

# To test error routing, create a failing Kustomization
flux create kustomization test-error \
  --source=GitRepository/flux-system \
  --path="./nonexistent" \
  --prune=true

# Clean up
flux delete kustomization test-error
```

## Routing Matrix

| Event Type | Info Alert | Error Alert | PagerDuty |
|---|---|---|---|
| Successful reconciliation | Delivered | Not delivered | Not delivered |
| Source updated | Delivered | Not delivered | Not delivered |
| Reconciliation failed | Delivered | Delivered | Delivered |
| Health check failed | Delivered | Delivered | Delivered |
| Source fetch failed | Delivered | Delivered | Delivered |

## Best Practices

1. **Always have an error-level alert** for production environments
2. **Use info-level alerts with exclusion rules** rather than raw info-level to reduce noise
3. **Route production errors to paging systems** for immediate response
4. **Keep audit logs at info level** with no exclusion rules for compliance
5. **Adjust severity routing as needed** when teams are overwhelmed or missing alerts

## Summary

Severity-based routing in Flux is implemented by creating multiple Alert resources with different `eventSeverity` values pointing to different providers. Info-level alerts capture all events for general awareness, while error-level alerts capture only failures for critical response. Combine severity routing with exclusion rules for info-level alerts and environment-specific targeting for a notification strategy that matches the urgency of each event to the appropriate response channel.

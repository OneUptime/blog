# How to Configure Multiple Alert Providers in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Notifications, Alerts, Multiple Providers

Description: Learn how to configure multiple notification providers in Flux to send alerts to different destinations such as Slack, Teams, and PagerDuty simultaneously.

---

In production environments, you often need to send Flux notifications to multiple destinations. For example, you might want deployment notifications in Slack, failure alerts in PagerDuty, and audit events sent to a webhook. Flux supports this by allowing you to create multiple Provider resources and multiple Alert resources, each routing events independently. This guide shows how to set up multiple alert providers.

## Prerequisites

- A Kubernetes cluster with Flux CD installed, including the notification controller
- Webhook URLs or API keys for your notification services
- Flux resources generating events

## How Multiple Providers Work

In Flux, each Alert resource references exactly one Provider through the `spec.providerRef` field. To send events to multiple destinations, you create multiple Provider resources and multiple Alert resources, each pairing a provider with specific event sources and severity filters. This design gives you full control over what goes where.

## Step 1: Create Multiple Provider Resources

Set up providers for different notification services.

```bash
# Create secrets for each provider
kubectl create secret generic slack-webhook \
  --namespace=flux-system \
  --from-literal=address=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

kubectl create secret generic teams-webhook \
  --namespace=flux-system \
  --from-literal=address=https://outlook.office.com/webhook/YOUR/TEAMS/WEBHOOK

kubectl create secret generic pagerduty-token \
  --namespace=flux-system \
  --from-literal=token=YOUR_PAGERDUTY_ROUTING_KEY
```

Now create the provider resources.

```yaml
# Slack provider for general notifications
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack-general
  namespace: flux-system
spec:
  type: slack
  channel: flux-notifications
  secretRef:
    name: slack-webhook
---
# Slack provider for critical alerts
apiVersion: notification.toolkit.fluxcd.io/v1
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
# Microsoft Teams provider
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: teams-provider
  namespace: flux-system
spec:
  type: msteams
  secretRef:
    name: teams-webhook
---
# Generic webhook provider for logging
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: webhook-logger
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: logger-webhook
```

Apply all providers.

```bash
# Apply all provider configurations
kubectl apply -f providers.yaml

# Verify providers are ready
kubectl get providers -n flux-system
```

## Step 2: Create Alerts for Each Provider

Create separate alerts that route different events to different providers.

```yaml
# Info-level alert to Slack general channel
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: slack-info-alert
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
    - ".*is not ready$"
---
# Error-level alert to Slack critical channel
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: slack-error-alert
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
---
# Error alert to Microsoft Teams
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: teams-error-alert
  namespace: flux-system
spec:
  providerRef:
    name: teams-provider
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: flux-system
    - kind: HelmRelease
      name: "*"
      namespace: flux-system
---
# All events to webhook logger for audit
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: webhook-audit-alert
  namespace: flux-system
spec:
  providerRef:
    name: webhook-logger
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

Apply all alerts.

```bash
# Apply all alert configurations
kubectl apply -f alerts.yaml

# Verify alerts are created
kubectl get alerts -n flux-system
```

## Step 3: Environment-Based Multi-Provider Routing

Route alerts from different environments to appropriate providers.

```yaml
# Staging alerts to Slack only
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: staging-slack-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-general
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: staging
    - kind: HelmRelease
      name: "*"
      namespace: staging
  exclusionList:
    - "^Reconciliation finished.*no changes$"
---
# Production errors to both Slack and Teams
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: prod-slack-alert
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
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: prod-teams-alert
  namespace: flux-system
spec:
  providerRef:
    name: teams-provider
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: "*"
      namespace: production
    - kind: HelmRelease
      name: "*"
      namespace: production
```

## Step 4: Verify Multi-Provider Setup

Check that all providers and alerts are configured correctly.

```bash
# List all providers
kubectl get providers -n flux-system

# List all alerts with their providers
kubectl get alerts -n flux-system -o custom-columns=NAME:.metadata.name,SEVERITY:.spec.eventSeverity,PROVIDER:.spec.providerRef.name

# Trigger a reconciliation to test
flux reconcile kustomization flux-system --with-source

# Check logs for delivery to all providers
kubectl logs -n flux-system deploy/notification-controller --tail=30
```

## Architecture Patterns

Here are common multi-provider architectures:

**Pattern 1: Severity-based routing**
- Info events to Slack general channel
- Error events to Slack critical channel and PagerDuty

**Pattern 2: Environment-based routing**
- Development events to a dev Slack channel
- Staging events to a staging Slack channel
- Production events to critical Slack channel, Teams, and PagerDuty

**Pattern 3: Audience-based routing**
- All events to an audit webhook for logging
- Deployment events to a developer Slack channel
- Failure events to an ops Teams channel

## Best Practices

1. **Use separate secrets** for each provider to allow independent credential rotation
2. **Name providers and alerts descriptively** so their purpose is clear at a glance
3. **Avoid duplicating event sources** unless you intentionally want the same event sent to multiple places
4. **Use severity filtering** to prevent low-priority events from reaching high-priority channels
5. **Keep audit/logging alerts separate** with info severity and no exclusion rules

## Summary

Configuring multiple alert providers in Flux gives you flexible notification routing. Each Alert resource connects to one Provider, so you create multiple alerts to send events to multiple destinations. This approach lets you route based on severity, environment, resource type, or any combination. Start with a clear routing strategy, create the necessary providers and alerts, and verify delivery by triggering reconciliations and checking the notification controller logs.

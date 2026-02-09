# How to Configure Flux Notification Controller for Slack and Teams Deployment Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flux, Notifications, Slack, Microsoft Teams, GitOps

Description: Learn how to set up Flux notification controller to send deployment alerts, reconciliation failures, and drift detection events to Slack, Microsoft Teams, and other communication platforms for real-time GitOps monitoring.

---

Silent deployments are dangerous. Your team needs to know when applications deploy, when reconciliation fails, and when configuration drift occurs. Flux's notification controller sends events to Slack, Teams, Discord, webhook endpoints, and other platforms, keeping everyone informed about GitOps operations.

This guide demonstrates how to configure comprehensive notifications that alert the right teams at the right time.

## Installing Flux Notification Controller

The notification controller installs with Flux by default:

```bash
flux install --components-extra=image-reflector-controller,image-automation-controller
```

Verify it's running:

```bash
kubectl get pods -n flux-system -l app=notification-controller
```

## Configuring Slack Notifications

Create a Slack incoming webhook:

1. Go to your Slack workspace settings
2. Navigate to Apps > Custom Integrations > Incoming Webhooks
3. Add a new webhook for your channel
4. Copy the webhook URL

Store the webhook in a Kubernetes Secret:

```bash
kubectl create secret generic slack-webhook-url \
  --from-literal=address=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX \
  -n flux-system
```

Create a Provider resource:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: deployments
  username: FluxBot
  secretRef:
    name: slack-webhook-url
```

Create an Alert to send notifications:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Alert
metadata:
  name: production-deployments
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
  - kind: GitRepository
    name: '*'
  - kind: Kustomization
    name: '*'
  - kind: HelmRelease
    name: '*'
```

## Configuring Microsoft Teams Notifications

Create a Teams incoming webhook:

1. Open your Teams channel
2. Click "..." > Connectors
3. Add "Incoming Webhook"
4. Name it and copy the URL

Store in a Secret:

```bash
kubectl create secret generic teams-webhook-url \
  --from-literal=address=https://outlook.office.com/webhook/... \
  -n flux-system
```

Create Teams Provider:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Provider
metadata:
  name: teams
  namespace: flux-system
spec:
  type: msteams
  channel: GitOps-Deployments
  secretRef:
    name: teams-webhook-url
```

Configure alerts:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Alert
metadata:
  name: teams-production-alerts
  namespace: flux-system
spec:
  providerRef:
    name: teams
  eventSeverity: error
  eventSources:
  - kind: Kustomization
    namespace: production
  - kind: HelmRelease
    namespace: production
  inclusionList:
  - ".*failed.*"
  - ".*error.*"
```

## Filtering Notifications by Severity

Create severity-based alerts:

```yaml
# Info-level for successful deployments
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Alert
metadata:
  name: deployment-success
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
  - kind: Kustomization
    name: '*'
  inclusionList:
  - ".*succeeded.*"
  - ".*healthy.*"
---
# Error-level for failures
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Alert
metadata:
  name: deployment-failures
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
  - kind: Kustomization
    name: '*'
  - kind: HelmRelease
    name: '*'
  inclusionList:
  - ".*failed.*"
  - ".*error.*"
  exclusionList:
  - ".*test-.*"  # Exclude test namespaces
```

## Environment-Specific Notifications

Route different environments to different channels:

```yaml
# Production to #production-deployments
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Provider
metadata:
  name: slack-production
  namespace: flux-system
spec:
  type: slack
  channel: production-deployments
  secretRef:
    name: slack-webhook-url
---
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Alert
metadata:
  name: production-only
  namespace: flux-system
spec:
  providerRef:
    name: slack-production
  eventSeverity: info
  eventSources:
  - kind: Kustomization
    namespace: production
---
# Staging to #staging-deployments
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Provider
metadata:
  name: slack-staging
  namespace: flux-system
spec:
  type: slack
  channel: staging-deployments
  secretRef:
    name: slack-webhook-url
---
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Alert
metadata:
  name: staging-only
  namespace: flux-system
spec:
  providerRef:
    name: slack-staging
  eventSeverity: info
  eventSources:
  - kind: Kustomization
    namespace: staging
```

## Configuring Generic Webhooks

Send notifications to custom endpoints:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Provider
metadata:
  name: webhook
  namespace: flux-system
spec:
  type: generic
  address: https://webhook.example.com/flux-events
  secretRef:
    name: webhook-auth
---
apiVersion: v1
kind: Secret
metadata:
  name: webhook-auth
  namespace: flux-system
stringData:
  token: your-auth-token
```

Configure webhook payload format:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Alert
metadata:
  name: webhook-alert
  namespace: flux-system
spec:
  providerRef:
    name: webhook
  eventSources:
  - kind: Kustomization
    name: '*'
  eventMetadata:
    env: production
    team: platform
```

## Setting Up Discord Notifications

Create a Discord webhook and configure Provider:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: discord-webhook-url
  namespace: flux-system
stringData:
  address: https://discord.com/api/webhooks/xxx/xxx
---
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Provider
metadata:
  name: discord
  namespace: flux-system
spec:
  type: discord
  username: FluxCD
  channel: deployments
  secretRef:
    name: discord-webhook-url
---
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Alert
metadata:
  name: discord-notifications
  namespace: flux-system
spec:
  providerRef:
    name: discord
  eventSeverity: info
  eventSources:
  - kind: GitRepository
    name: '*'
  - kind: Kustomization
    name: '*'
```

## Configuring PagerDuty Integration

For critical production alerts:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: pagerduty-token
  namespace: flux-system
stringData:
  token: your-pagerduty-integration-key
---
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Provider
metadata:
  name: pagerduty
  namespace: flux-system
spec:
  type: pagerduty
  secretRef:
    name: pagerduty-token
---
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Alert
metadata:
  name: critical-failures
  namespace: flux-system
spec:
  providerRef:
    name: pagerduty
  eventSeverity: error
  eventSources:
  - kind: Kustomization
    namespace: production
  - kind: HelmRelease
    namespace: production
  inclusionList:
  - ".*failed.*"
  - ".*degraded.*"
```

## Implementing Alert Grouping

Prevent notification spam with summary alerts:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Alert
metadata:
  name: summary-alert
  namespace: flux-system
spec:
  summary: "GitOps Activity Summary"
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
  - kind: Kustomization
    name: '*'
  - kind: HelmRelease
    name: '*'
  suspend: false
```

## Adding Custom Metadata to Notifications

Include additional context:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Alert
metadata:
  name: enriched-notifications
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
  - kind: Kustomization
    name: '*'
  eventMetadata:
    cluster: production-us-east-1
    team: platform-team
    runbook: https://wiki.company.com/gitops-runbook
```

## Monitoring Image Updates

Get notified of automatic image updates:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Alert
metadata:
  name: image-updates
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
  - kind: ImageRepository
    name: '*'
  - kind: ImagePolicy
    name: '*'
  - kind: ImageUpdateAutomation
    name: '*'
```

## Testing Notifications

Send a test notification:

```bash
# Trigger reconciliation
flux reconcile kustomization production-apps

# Force a notification
kubectl annotate kustomization production-apps -n flux-system \
  reconcile.fluxcd.io/requestedAt="$(date +%s)"
```

View notification controller logs:

```bash
kubectl logs -n flux-system deployment/notification-controller -f
```

## Creating Notification Templates

Customize message format (in Provider spec):

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Provider
metadata:
  name: slack-custom
  namespace: flux-system
spec:
  type: slack
  channel: deployments
  secretRef:
    name: slack-webhook-url
```

Note: Flux uses predefined templates. For fully custom templates, use a generic webhook with your own formatting service.

## Handling Notification Failures

Set up alerts for notification failures:

```bash
# Check notification controller status
flux logs --kind=provider --name=slack

# View alert status
kubectl describe alert production-deployments -n flux-system
```

Configure retry policy in Alert:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Alert
metadata:
  name: resilient-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
  - kind: Kustomization
    name: '*'
  suspend: false  # Keep trying even if provider is down
```

## Best Practices

Create separate Slack channels for different severity levels. Info messages go to #deployments, errors go to #deployments-critical.

Use exclusionList to filter noise. Exclude test namespaces and expected transient failures.

Set up both Slack and PagerDuty. Use Slack for visibility, PagerDuty for actionable alerts that require immediate response.

Include metadata like cluster name and environment. Multi-cluster deployments need context to understand where events occurred.

Test notifications in development first. Avoid spamming production channels while configuring alerts.

Monitor notification controller health. Failed notifications mean teams miss critical deployment information.

Flux notification controller transforms GitOps into a transparent, observable process where teams stay informed about deployments, failures, and configuration changes in real-time.

# How to Configure Tenant-Specific Notification Channels in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, Notifications, Alerting

Description: Learn how to set up tenant-specific notification channels in Flux CD so each team receives alerts about their own deployments and reconciliation status.

---

In a multi-tenant Flux CD environment, each tenant team needs visibility into their own deployment status without seeing events from other tenants. Flux CD's notification controller supports per-namespace notification providers and alerts, making it straightforward to route events to the right teams. This guide covers how to configure tenant-specific notification channels.

## How Flux Notifications Work

Flux's notification controller watches for events from Flux resources (Kustomizations, HelmReleases, GitRepositories) and forwards them to configured providers. Providers and Alerts are namespace-scoped, so each tenant namespace can have its own notification configuration.

## Step 1: Create a Notification Provider for the Tenant

Define a notification provider in the tenant's namespace. This example uses Slack, but Flux supports many provider types including Microsoft Teams, Discord, Generic Webhook, and more.

```yaml
# tenants/team-alpha/notification-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: team-alpha-slack
  namespace: team-alpha
spec:
  type: slack
  channel: team-alpha-deployments
  secretRef:
    name: team-alpha-slack-token
```

Create the secret containing the Slack webhook URL.

```bash
# Create the Slack webhook secret for the tenant
kubectl create secret generic team-alpha-slack-token \
  --from-literal=address=https://hooks.slack.com/services/T00/B00/XXXX \
  -n team-alpha
```

## Step 2: Configure Alerts for the Tenant

Create an Alert that watches the tenant's Flux resources and sends events to their notification provider.

```yaml
# tenants/team-alpha/alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: team-alpha-deployment-alerts
  namespace: team-alpha
spec:
  providerRef:
    name: team-alpha-slack
  eventSeverity: info
  eventSources:
    # Watch the tenant's Kustomization for deployment events
    - kind: Kustomization
      name: team-alpha-apps
    # Watch the tenant's Git repository for source events
    - kind: GitRepository
      name: team-alpha-apps
  # Optional: exclude specific event types
  exclusionList:
    - ".*no changes.*"
```

## Step 3: Configure Multiple Notification Channels

Tenants may want different channels for different severity levels or different applications.

```yaml
# tenants/team-alpha/providers.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: team-alpha-slack-info
  namespace: team-alpha
spec:
  type: slack
  channel: team-alpha-deployments
  secretRef:
    name: team-alpha-slack-token
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: team-alpha-slack-errors
  namespace: team-alpha
spec:
  type: slack
  channel: team-alpha-alerts
  secretRef:
    name: team-alpha-slack-token
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: team-alpha-pagerduty
  namespace: team-alpha
spec:
  type: generic
  address: https://events.pagerduty.com/v2/enqueue
  secretRef:
    name: team-alpha-pagerduty-key
```

Create alerts routed to the appropriate channels.

```yaml
# tenants/team-alpha/multi-alerts.yaml
# Info-level deployments go to the deployments channel
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: team-alpha-info-alerts
  namespace: team-alpha
spec:
  providerRef:
    name: team-alpha-slack-info
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: team-alpha-apps
    - kind: GitRepository
      name: team-alpha-apps
  exclusionList:
    - ".*error.*"
---
# Errors go to the alerts channel and PagerDuty
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: team-alpha-error-alerts
  namespace: team-alpha
spec:
  providerRef:
    name: team-alpha-slack-errors
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: team-alpha-apps
    - kind: GitRepository
      name: team-alpha-apps
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: team-alpha-pagerduty-alerts
  namespace: team-alpha
spec:
  providerRef:
    name: team-alpha-pagerduty
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: team-alpha-apps
```

## Step 4: Use Microsoft Teams as a Provider

For teams using Microsoft Teams instead of Slack.

```yaml
# tenants/team-beta/teams-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: team-beta-teams
  namespace: team-beta
spec:
  type: msteams
  address: https://outlook.office.com/webhook/XXXX
  secretRef:
    name: team-beta-teams-webhook
```

## Step 5: Use Generic Webhooks for Custom Integrations

For custom audit systems or logging platforms, use the generic webhook provider.

```yaml
# tenants/team-alpha/webhook-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: team-alpha-webhook
  namespace: team-alpha
spec:
  type: generic
  address: https://api.example.com/flux-events
  headers:
    X-Tenant: team-alpha
    Content-Type: application/json
  secretRef:
    name: team-alpha-webhook-auth
```

## Step 6: Platform Admin Global Alerts

In addition to tenant-specific alerts, the platform admin should have alerts that monitor all tenants.

```yaml
# infrastructure/notifications/global-alerts.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: platform-alerts
  namespace: flux-system
spec:
  type: slack
  channel: platform-alerts
  secretRef:
    name: platform-slack-token
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: global-reconciliation-errors
  namespace: flux-system
spec:
  providerRef:
    name: platform-alerts
  eventSeverity: error
  eventSources:
    # Monitor the tenants Kustomization managed by platform admin
    - kind: Kustomization
      name: tenants
    - kind: Kustomization
      name: infrastructure
```

## Step 7: Include Notifications in Tenant Onboarding

Add notification setup to your tenant onboarding template so every tenant gets notifications by default.

```yaml
# tenants/base/notification-template.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: tenant-slack
spec:
  type: slack
  channel: tenant-placeholder-deployments
  secretRef:
    name: tenant-slack-token
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: tenant-alerts
spec:
  providerRef:
    name: tenant-slack
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: GitRepository
      name: "*"
    - kind: HelmRelease
      name: "*"
```

## Step 8: Verify Notification Configuration

Check that notifications are configured correctly and working.

```bash
# List notification providers in the tenant namespace
kubectl get providers.notification.toolkit.fluxcd.io -n team-alpha

# List alerts in the tenant namespace
kubectl get alerts.notification.toolkit.fluxcd.io -n team-alpha

# Check the notification controller logs for errors
kubectl logs -n flux-system deployment/notification-controller | grep team-alpha

# Force a reconciliation to trigger a notification
flux reconcile kustomization team-alpha-apps -n team-alpha --with-source
```

## Summary

Tenant-specific notification channels in Flux CD are configured using namespace-scoped Provider and Alert resources. Each tenant can have multiple providers (Slack, Teams, PagerDuty, webhooks) with alerts routed by severity level. The platform admin should maintain global alerts for cluster-wide monitoring while tenants manage their own notification preferences within their namespaces. Include notification setup in your tenant onboarding template to ensure consistent alerting across all tenants.

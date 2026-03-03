# How to Subscribe to Specific Application Notifications in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Notifications

Description: Learn how to subscribe to specific ArgoCD application notifications to receive targeted alerts for deployment events, sync failures, and health changes on individual applications.

---

ArgoCD Notifications is the built-in notification engine that sends alerts about application events to external services like Slack, Microsoft Teams, email, and webhooks. While you can set up blanket notifications for all applications, the real power comes from subscribing to notifications on specific applications. This lets you route deployment alerts for the payment service to the payments team channel, while infrastructure alerts go to the platform team.

## How ArgoCD Notification Subscriptions Work

ArgoCD Notifications uses a trigger-template-subscription model:

- **Triggers** define the conditions that fire a notification (e.g., sync succeeded, health degraded)
- **Templates** define the message content and format
- **Subscriptions** connect triggers to notification services for specific applications

Subscriptions are configured through annotations on Application resources. This means each application can have its own set of notification destinations, independent of other applications.

## Prerequisites

Before configuring subscriptions, ensure ArgoCD Notifications is installed and you have at least one notification service configured:

```yaml
# argocd-notifications-cm ConfigMap - service configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Slack service
  service.slack: |
    token: $slack-token
    signingSecret: $slack-signing-secret

  # Email service
  service.email: |
    host: smtp.gmail.com
    port: 587
    from: argocd@mycompany.com
    username: $email-username
    password: $email-password

  # Webhook service
  service.webhook.deployment-tracker: |
    url: https://internal-api.mycompany.com/deployments
    headers:
      - name: Authorization
        value: Bearer $webhook-token
      - name: Content-Type
        value: application/json
```

And configure the triggers and templates:

```yaml
# In argocd-notifications-cm
data:
  # Trigger definitions
  trigger.on-sync-succeeded: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [sync-succeeded]
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [sync-failed]
  trigger.on-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      send: [health-degraded]
  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
      send: [app-deployed]

  # Template definitions
  template.sync-succeeded: |
    message: |
      Application {{.app.metadata.name}} has been successfully synced.
      Revision: {{.app.status.sync.revision}}
    slack:
      attachments: |
        [{
          "color": "#18be52",
          "title": "{{.app.metadata.name}} - Sync Succeeded",
          "fields": [
            {"title": "Project", "value": "{{.app.spec.project}}", "short": true},
            {"title": "Revision", "value": "{{.app.status.sync.revision | trunc 7}}", "short": true}
          ]
        }]

  template.sync-failed: |
    message: |
      Application {{.app.metadata.name}} sync has failed.
      Error: {{.app.status.operationState.message}}
    slack:
      attachments: |
        [{
          "color": "#E96D76",
          "title": "{{.app.metadata.name}} - Sync Failed",
          "fields": [
            {"title": "Error", "value": "{{.app.status.operationState.message}}", "short": false}
          ]
        }]

  template.health-degraded: |
    message: |
      Application {{.app.metadata.name}} health is degraded.

  template.app-deployed: |
    message: |
      Application {{.app.metadata.name}} has been deployed successfully.
```

## Subscribing Individual Applications

Subscribe an application to notifications by adding annotations:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service
  namespace: argocd
  annotations:
    # Subscribe to sync-succeeded notifications on Slack
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: payments-deployments

    # Subscribe to sync-failed notifications on Slack (different channel)
    notifications.argoproj.io/subscribe.on-sync-failed.slack: payments-alerts

    # Subscribe to health-degraded via email
    notifications.argoproj.io/subscribe.on-health-degraded.email: payments-team@mycompany.com

    # Subscribe to deployed notifications via webhook
    notifications.argoproj.io/subscribe.on-deployed.deployment-tracker: ""
spec:
  project: production
  source:
    repoURL: https://github.com/my-org/payment-service.git
    targetRevision: main
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: payments
```

The annotation format is:

```text
notifications.argoproj.io/subscribe.<trigger-name>.<service-name>: <recipient>
```

Where:
- `<trigger-name>` is the name from your trigger configuration (without the `trigger.` prefix)
- `<service-name>` is the notification service type (slack, email, webhook, teams, etc.)
- `<recipient>` is the destination (channel name, email address, or empty for webhooks)

## Subscribing to Multiple Triggers

An application can subscribe to as many triggers as needed:

```yaml
metadata:
  annotations:
    # All sync events to the team channel
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: team-deployments
    notifications.argoproj.io/subscribe.on-sync-failed.slack: team-alerts
    notifications.argoproj.io/subscribe.on-sync-running.slack: team-deployments

    # Health events to PagerDuty
    notifications.argoproj.io/subscribe.on-health-degraded.slack: team-alerts

    # All events to a webhook for audit logging
    notifications.argoproj.io/subscribe.on-sync-succeeded.webhook.audit-log: ""
    notifications.argoproj.io/subscribe.on-sync-failed.webhook.audit-log: ""
    notifications.argoproj.io/subscribe.on-health-degraded.webhook.audit-log: ""
```

## Subscribing to Multiple Channels

Send the same trigger to multiple Slack channels by separating them with a semicolon:

```yaml
metadata:
  annotations:
    # Send sync failures to both the team channel and a global alerts channel
    notifications.argoproj.io/subscribe.on-sync-failed.slack: "payments-alerts;global-deploy-failures"
```

## Subscribing via the CLI

You can add notification subscriptions using `kubectl` without editing the full Application YAML:

```bash
# Subscribe payment-service to sync-succeeded on Slack
kubectl annotate application payment-service -n argocd \
  notifications.argoproj.io/subscribe.on-sync-succeeded.slack=payments-deployments

# Subscribe to multiple triggers
kubectl annotate application payment-service -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed.slack=payments-alerts \
  notifications.argoproj.io/subscribe.on-health-degraded.slack=payments-alerts

# Verify annotations
kubectl get application payment-service -n argocd -o json | \
  jq '.metadata.annotations | to_entries[] | select(.key | startswith("notifications"))'
```

## Real-World Subscription Patterns

### Team-Based Routing

Route notifications based on team ownership:

```yaml
# Frontend team's application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: web-frontend
  annotations:
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: frontend-deploys
    notifications.argoproj.io/subscribe.on-sync-failed.slack: frontend-alerts
    notifications.argoproj.io/subscribe.on-health-degraded.slack: frontend-alerts

---
# Backend team's application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-gateway
  annotations:
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: backend-deploys
    notifications.argoproj.io/subscribe.on-sync-failed.slack: backend-alerts
    notifications.argoproj.io/subscribe.on-health-degraded.slack: backend-alerts
```

### Environment-Based Alerting

Different notification urgency per environment:

```yaml
# Production - notify everything, multiple channels
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-production
  annotations:
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: prod-deployments
    notifications.argoproj.io/subscribe.on-sync-failed.slack: "prod-alerts;incident-channel"
    notifications.argoproj.io/subscribe.on-health-degraded.slack: prod-alerts
    notifications.argoproj.io/subscribe.on-sync-failed.email: oncall@mycompany.com

---
# Staging - only notify on failures
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: api-staging
  annotations:
    notifications.argoproj.io/subscribe.on-sync-failed.slack: staging-alerts
```

## Testing Your Subscriptions

After configuring subscriptions, verify they work:

```bash
# Check the notification controller logs
kubectl logs -n argocd deployment/argocd-notifications-controller \
  --tail=50 | grep "payment-service"

# Trigger a test by syncing the application
argocd app sync payment-service

# Check for delivery errors
kubectl logs -n argocd deployment/argocd-notifications-controller \
  --tail=100 | grep -i "error\|fail\|deliver"
```

If notifications are not arriving, common issues include incorrect channel names, missing bot permissions in Slack, or expired tokens. For more on notification configuration, see our guide on [How to Configure Notifications in ArgoCD](https://oneuptime.com/blog/post/2026-01-25-notifications-argocd/view).

# How to set up ArgoCD notification triggers for Slack and email alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Kubernetes, GitOps, Monitoring, Notifications

Description: Learn how to configure ArgoCD notifications with Slack and email triggers to receive real-time alerts about deployment status, sync failures, and application health changes in your Kubernetes GitOps workflows.

---

ArgoCD Notifications provides a flexible system for sending alerts about application sync status, health changes, and deployment events. By integrating with Slack and email, you keep teams informed about deployment activities without constantly monitoring the ArgoCD UI. This guide shows you how to configure notification triggers for both channels.

## Installing ArgoCD Notifications

ArgoCD Notifications comes as a separate component that integrates with your ArgoCD installation. Install it using kubectl:

```bash
# Install ArgoCD Notifications
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj-labs/argocd-notifications/stable/manifests/install.yaml

# Verify installation
kubectl get deployment -n argocd argocd-notifications-controller

# Check the controller logs
kubectl logs -n argocd deployment/argocd-notifications-controller
```

The notifications controller watches ArgoCD applications and triggers notifications based on configured rules.

## Configuring Slack Notifications

Start by creating a Slack app and obtaining a webhook URL or bot token. For webhook integration, create an incoming webhook in your Slack workspace.

Configure Slack in the ArgoCD notifications ConfigMap:

```yaml
# slack-notification-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Slack service configuration using webhook
  service.slack: |
    token: $slack-token

  # Alternative: use webhook URL directly
  # service.slack: |
  #   webhookUrl: https://hooks.slack.com/services/YOUR/WEBHOOK/URL

  # Define notification templates
  template.app-deployed: |
    message: |
      Application {{.app.metadata.name}} is now running new version.
      Sync Status: {{.app.status.sync.status}}
      Health Status: {{.app.status.health.status}}
      Revision: {{.app.status.sync.revision}}
    slack:
      attachments: |
        [{
          "title": "{{.app.metadata.name}}",
          "title_link": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}",
          "color": "#18be52",
          "fields": [
            {
              "title": "Sync Status",
              "value": "{{.app.status.sync.status}}",
              "short": true
            },
            {
              "title": "Health Status",
              "value": "{{.app.status.health.status}}",
              "short": true
            },
            {
              "title": "Repository",
              "value": "{{.app.spec.source.repoURL}}",
              "short": false
            }
          ]
        }]

  template.app-sync-failed: |
    message: |
      Application {{.app.metadata.name}} sync failed!
      Sync Status: {{.app.status.sync.status}}
      Error: {{.app.status.operationState.message}}
    slack:
      attachments: |
        [{
          "title": "{{.app.metadata.name}}",
          "title_link": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}",
          "color": "#E96D76",
          "fields": [
            {
              "title": "Sync Status",
              "value": "{{.app.status.sync.status}}",
              "short": true
            },
            {
              "title": "Error",
              "value": "{{.app.status.operationState.message}}",
              "short": false
            }
          ]
        }]

  # Define triggers
  trigger.on-deployed: |
    - when: app.status.sync.status == 'Synced' and app.status.health.status == 'Healthy'
      send: [app-deployed]

  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [app-sync-failed]
```

Store the Slack token in a secret:

```bash
# Create secret with Slack token
kubectl create secret generic argocd-notifications-secret \
  -n argocd \
  --from-literal=slack-token=xoxb-your-slack-bot-token
```

## Configuring Email Notifications

Email notifications require SMTP server configuration. Configure email service in the notifications ConfigMap:

```yaml
# email-notification-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Email service configuration
  service.email.gmail: |
    username: $email-username
    password: $email-password
    host: smtp.gmail.com
    port: 465
    from: $email-username

  # Generic SMTP configuration
  service.email.smtp: |
    username: $email-username
    password: $email-password
    host: smtp.example.com
    port: 587
    from: argocd@example.com

  # Email templates
  template.app-deployed-email: |
    email:
      subject: ArgoCD - Application {{.app.metadata.name}} deployed successfully
    message: |
      Application: {{.app.metadata.name}}
      Namespace: {{.app.metadata.namespace}}
      Sync Status: {{.app.status.sync.status}}
      Health Status: {{.app.status.health.status}}

      Repository: {{.app.spec.source.repoURL}}
      Target Revision: {{.app.spec.source.targetRevision}}
      Deployed Revision: {{.app.status.sync.revision}}

      ArgoCD URL: {{.context.argocdUrl}}/applications/{{.app.metadata.name}}

  template.app-health-degraded-email: |
    email:
      subject: ALERT - Application {{.app.metadata.name}} health degraded
    message: |
      Application {{.app.metadata.name}} health status changed to {{.app.status.health.status}}

      Application: {{.app.metadata.name}}
      Namespace: {{.app.metadata.namespace}}
      Health Status: {{.app.status.health.status}}
      Sync Status: {{.app.status.sync.status}}

      Please check the application: {{.context.argocdUrl}}/applications/{{.app.metadata.name}}

  # Email triggers
  trigger.on-deployed-email: |
    - when: app.status.sync.status == 'Synced' and app.status.health.status == 'Healthy'
      send: [app-deployed-email]

  trigger.on-health-degraded-email: |
    - when: app.status.health.status == 'Degraded'
      send: [app-health-degraded-email]
```

Create a secret with email credentials:

```bash
# Create email credentials secret
kubectl create secret generic argocd-notifications-secret \
  -n argocd \
  --from-literal=email-username=your-email@example.com \
  --from-literal=email-password=your-app-password
```

For Gmail, generate an app-specific password rather than using your account password.

## Subscribing Applications to Notifications

Enable notifications for specific applications using annotations:

```yaml
# application-with-notifications.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: demo-app
  namespace: argocd
  annotations:
    # Subscribe to Slack notifications
    notifications.argoproj.io/subscribe.on-deployed.slack: engineering-deployments
    notifications.argoproj.io/subscribe.on-sync-failed.slack: engineering-alerts

    # Subscribe to email notifications
    notifications.argoproj.io/subscribe.on-deployed-email.email: team@example.com
    notifications.argoproj.io/subscribe.on-health-degraded-email.email: oncall@example.com;team@example.com
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/manifests
    targetRevision: main
    path: apps/demo
  destination:
    server: https://kubernetes.default.svc
    namespace: demo
```

The annotation format is `notifications.argoproj.io/subscribe.<trigger-name>.<notification-service>: <recipient>`. For Slack, use channel names. For email, use email addresses separated by semicolons for multiple recipients.

## Creating Custom Triggers

Define custom triggers for specific conditions:

```yaml
# custom-triggers-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Trigger when sync takes longer than expected
  trigger.on-slow-sync: |
    - when: app.status.operationState != nil and app.status.operationState.phase in ['Running'] and app.status.operationState.startedAt != nil
      oncePer: app.status.operationState.startedAt
      send: [slow-sync-alert]

  template.slow-sync-alert: |
    message: |
      Application {{.app.metadata.name}} sync is taking longer than expected.
      Started at: {{.app.status.operationState.startedAt}}
    slack:
      attachments: |
        [{
          "title": "Slow Sync Alert",
          "color": "#FFA500",
          "fields": [
            {
              "title": "Application",
              "value": "{{.app.metadata.name}}",
              "short": true
            },
            {
              "title": "Duration",
              "value": "Check ArgoCD UI for details",
              "short": true
            }
          ]
        }]

  # Trigger on any sync status change
  trigger.on-sync-status-change: |
    - when: app.status.sync.status != nil
      oncePer: app.status.sync.status
      send: [sync-status-notification]

  template.sync-status-notification: |
    message: |
      Application {{.app.metadata.name}} sync status changed to {{.app.status.sync.status}}
    slack:
      text: "Application {{.app.metadata.name}} sync status: {{.app.status.sync.status}}"
```

The `oncePer` field prevents notification spam by sending alerts only when the specified value changes.

## Multi-Channel Notifications

Configure applications to send notifications to multiple channels:

```yaml
# multi-channel-notifications.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: critical-app
  namespace: argocd
  annotations:
    # Send deployment success to multiple Slack channels
    notifications.argoproj.io/subscribe.on-deployed.slack: deployments;engineering-team;product-team

    # Send failures to urgent channel and email
    notifications.argoproj.io/subscribe.on-sync-failed.slack: urgent-alerts
    notifications.argoproj.io/subscribe.on-sync-failed.email: oncall@example.com;engineering@example.com

    # Send health issues to both channels
    notifications.argoproj.io/subscribe.on-health-degraded.slack: health-alerts
    notifications.argoproj.io/subscribe.on-health-degraded.email: sre-team@example.com
spec:
  project: production
  source:
    repoURL: https://github.com/your-org/production-manifests
    targetRevision: main
    path: apps/critical
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

## Notification Templates with Rich Formatting

Create detailed notification templates with comprehensive information:

```yaml
# rich-notification-templates.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  template.deployment-summary: |
    message: |
      Deployment Summary for {{.app.metadata.name}}

      Status: {{.app.status.sync.status}}
      Health: {{.app.status.health.status}}
      Revision: {{.app.status.sync.revision}}
      Repository: {{.app.spec.source.repoURL}}
      Path: {{.app.spec.source.path}}

      {{- if .app.status.operationState}}
      Operation: {{.app.status.operationState.operation.sync.revision}}
      Started: {{.app.status.operationState.startedAt}}
      Finished: {{.app.status.operationState.finishedAt}}
      {{- end}}

      Resources:
      {{- range .app.status.resources}}
      - {{.kind}}/{{.name}}: {{.status}}
      {{- end}}
    slack:
      attachments: |
        [{
          "title": "{{.app.metadata.name}}",
          "title_link": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}",
          "color": "{{- if eq .app.status.health.status \"Healthy\"}}#18be52{{- else if eq .app.status.health.status \"Degraded\"}}#FFA500{{- else}}#E96D76{{- end}}",
          "fields": [
            {
              "title": "Sync Status",
              "value": "{{.app.status.sync.status}}",
              "short": true
            },
            {
              "title": "Health Status",
              "value": "{{.app.status.health.status}}",
              "short": true
            },
            {
              "title": "Repository",
              "value": "<{{.app.spec.source.repoURL}}|{{.app.spec.source.repoURL}}>",
              "short": false
            },
            {
              "title": "Revision",
              "value": "{{.app.status.sync.revision}}",
              "short": true
            }
          ]
        }]
    email:
      subject: Deployment Summary - {{.app.metadata.name}}
```

These templates use Go templating to conditionally format messages based on application state.

## Testing Notifications

Test notification configuration before relying on it in production:

```bash
# Trigger a test notification
argocd app sync test-app --async

# Check notification controller logs
kubectl logs -n argocd deployment/argocd-notifications-controller -f

# Manually trigger a notification for testing
kubectl patch app test-app -n argocd \
  --type json \
  -p='[{"op": "replace", "path": "/metadata/annotations/notifications.argoproj.io~1subscribe.on-deployed.slack", "value":"test-channel"}]'

# Force a sync to trigger notifications
argocd app sync test-app
```

Monitor the logs for any errors in template rendering or delivery failures.

## Notification Throttling

Prevent notification spam with throttling:

```yaml
# throttled-triggers.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  trigger.on-health-degraded-throttled: |
    - when: app.status.health.status == 'Degraded'
      oncePer: app.metadata.name
      send: [app-health-degraded]
      # Only send notification once per hour
      throttle: 1h

  trigger.on-sync-running-periodic: |
    - when: app.status.operationState.phase in ['Running']
      send: [sync-running]
      throttle: 5m
```

Throttling limits notification frequency, useful for long-running operations or flapping health status.

## Monitoring Notification Delivery

Track notification delivery success:

```bash
# Check notification metrics
kubectl port-forward -n argocd svc/argocd-notifications-controller-metrics 9001:9001

# Access metrics endpoint
curl http://localhost:9001/metrics | grep notification

# View recent notification attempts
kubectl logs -n argocd deployment/argocd-notifications-controller --tail=100
```

Set up alerts on notification delivery failures to ensure the system remains operational.

## Best Practices

Start with a small set of critical applications before enabling notifications broadly. This lets you refine templates and triggers.

Use different notification channels for different severity levels. Route normal deployments to general channels and failures to urgent channels.

Keep notification messages concise for Slack and detailed for email. Slack notifications should fit mobile screens.

Test notification templates thoroughly in development before production deployment. Incorrect templates can crash the notification controller.

Document notification subscriptions at the project level so teams understand which alerts they receive.

Monitor notification delivery rates and adjust throttling as needed to prevent alert fatigue while maintaining visibility.

Use semantic color coding in Slack attachments: green for success, orange for warnings, red for failures.

## Conclusion

ArgoCD notifications with Slack and email integration keep teams informed about deployment activities without manual monitoring. By configuring appropriate triggers, templates, and subscriptions, you create a notification system that alerts the right people at the right time. Combined with throttling and rich formatting, ArgoCD notifications provide valuable deployment visibility while preventing alert fatigue, making your GitOps workflows more transparent and reliable.

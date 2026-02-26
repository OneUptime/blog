# How to Configure ArgoCD Notifications for Failed Syncs Only

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Notifications, Monitoring

Description: Configure ArgoCD notifications to alert only on failed syncs and degraded health, reducing noise while catching real deployment problems.

---

Nobody wants to be bombarded with Slack messages every time a deployment succeeds. What you actually want is to know when something goes wrong. Configuring ArgoCD notifications to fire only on failed syncs keeps your alert channels useful and prevents notification fatigue.

ArgoCD Notifications is a separate controller that watches Application resources and sends alerts based on configurable triggers. Let me show you how to set it up to notify only on failures.

## Installing ArgoCD Notifications

If you installed ArgoCD via Helm, notifications might already be included. Otherwise, install it separately.

```bash
# Install ArgoCD Notifications
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/notifications_catalog/install.yaml
```

Or if you are using Helm:

```bash
helm upgrade argocd argo/argo-cd \
  -n argocd \
  --set notifications.enabled=true
```

## Configuring the Notification Service

First, set up the notification service (Slack in this example). Create or update the `argocd-notifications-secret` with your credentials.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: argocd-notifications-secret
  namespace: argocd
type: Opaque
stringData:
  # Slack bot token
  slack-token: xoxb-your-slack-bot-token
```

Then configure the service in the `argocd-notifications-cm` ConfigMap.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Configure Slack as a notification service
  service.slack: |
    token: $slack-token
    signingSecret: ""
```

## Setting Up Failure-Only Triggers

The key to getting failure-only notifications is in the trigger configuration. ArgoCD Notifications supports trigger conditions written as expressions that evaluate against the Application state.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.slack: |
    token: $slack-token

  # Trigger: fires when a sync operation fails
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send:
        - sync-failed-message

  # Trigger: fires when app health degrades after sync
  trigger.on-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      send:
        - health-degraded-message

  # Trigger: fires when sync status is Unknown (usually means an error)
  trigger.on-sync-status-unknown: |
    - when: app.status.sync.status == 'Unknown'
      send:
        - sync-unknown-message

  # Message template for failed syncs
  template.sync-failed-message: |
    slack:
      attachments: |
        [{
          "color": "#E96D76",
          "title": "Sync Failed: {{.app.metadata.name}}",
          "text": "Application {{.app.metadata.name}} sync failed.",
          "fields": [
            {
              "title": "Application",
              "value": "{{.app.metadata.name}}",
              "short": true
            },
            {
              "title": "Sync Status",
              "value": "{{.app.status.operationState.phase}}",
              "short": true
            },
            {
              "title": "Error Message",
              "value": "{{.app.status.operationState.message}}",
              "short": false
            },
            {
              "title": "Repository",
              "value": "{{.app.spec.source.repoURL}}",
              "short": true
            },
            {
              "title": "Revision",
              "value": "{{.app.status.operationState.syncResult.revision}}",
              "short": true
            }
          ]
        }]

  # Message template for health degradation
  template.health-degraded-message: |
    slack:
      attachments: |
        [{
          "color": "#E96D76",
          "title": "Health Degraded: {{.app.metadata.name}}",
          "text": "Application {{.app.metadata.name}} health status is Degraded.",
          "fields": [
            {
              "title": "Application",
              "value": "{{.app.metadata.name}}",
              "short": true
            },
            {
              "title": "Health Status",
              "value": "{{.app.status.health.status}}",
              "short": true
            }
          ]
        }]

  # Message template for unknown sync status
  template.sync-unknown-message: |
    slack:
      attachments: |
        [{
          "color": "#FFA500",
          "title": "Sync Unknown: {{.app.metadata.name}}",
          "text": "Application {{.app.metadata.name}} sync status is Unknown.",
          "fields": [
            {
              "title": "Application",
              "value": "{{.app.metadata.name}}",
              "short": true
            }
          ]
        }]
```

## Subscribing Applications to Notifications

Once triggers are configured, you need to subscribe your Applications to them. You can do this per-application or globally.

### Per-Application Subscription

Add annotations to the Application resource.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
  annotations:
    # Subscribe to failure notifications only
    notifications.argoproj.io/subscribe.on-sync-failed.slack: deployments-alerts
    notifications.argoproj.io/subscribe.on-health-degraded.slack: deployments-alerts
```

The format is `notifications.argoproj.io/subscribe.<trigger>.<service>: <channel>`.

### Global Subscription via Default Triggers

To apply failure notifications to all applications without adding annotations to each one, use default triggers.

```yaml
# In argocd-notifications-cm
data:
  # Default triggers applied to all applications
  defaultTriggers: |
    - on-sync-failed
    - on-health-degraded

  # Default subscription
  subscriptions: |
    - recipients:
        - slack:deployments-alerts
      triggers:
        - on-sync-failed
        - on-health-degraded
```

## Adding Microsoft Teams Notifications

If your team uses Microsoft Teams instead of Slack, configure the Teams webhook.

```yaml
data:
  service.teams: |
    recipientUrls:
      deployments-channel: https://outlook.office.com/webhook/xxx

  template.sync-failed-message: |
    teams:
      title: "Sync Failed: {{.app.metadata.name}}"
      text: |
        Application **{{.app.metadata.name}}** sync operation failed.
        
        **Error:** {{.app.status.operationState.message}}
        **Repository:** {{.app.spec.source.repoURL}}
      themeColor: "#FF0000"
```

## Adding Email Notifications

For email alerts, configure an SMTP service.

```yaml
data:
  service.email: |
    host: smtp.example.com
    port: 587
    from: argocd-alerts@example.com
    username: $email-username
    password: $email-password

  template.sync-failed-message: |
    email:
      subject: "[ArgoCD] Sync Failed: {{.app.metadata.name}}"
    message: |
      Application {{.app.metadata.name}} sync failed.
      Error: {{.app.status.operationState.message}}
```

## Adding Webhook Notifications

For integration with incident management tools like [OneUptime](https://oneuptime.com) or PagerDuty, use webhook notifications.

```yaml
data:
  service.webhook.oneuptime: |
    url: https://oneuptime.com/api/webhook/argocd
    headers:
      - name: Content-Type
        value: application/json

  template.sync-failed-message: |
    webhook:
      oneuptime:
        method: POST
        body: |
          {
            "application": "{{.app.metadata.name}}",
            "status": "{{.app.status.operationState.phase}}",
            "message": "{{.app.status.operationState.message}}",
            "repository": "{{.app.spec.source.repoURL}}"
          }
```

## Advanced Trigger Conditions

You can create more sophisticated triggers that only fire under specific conditions.

```yaml
data:
  # Only notify for production applications
  trigger.on-prod-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed'] && app.spec.destination.namespace in ['production', 'prod']
      send:
        - sync-failed-message

  # Notify when an app has been OutOfSync for more than 10 minutes
  trigger.on-prolonged-outofsync: |
    - when: app.status.sync.status == 'OutOfSync' && time.Now().Sub(time.Parse(app.status.operationState.finishedAt)).Minutes() > 10
      send:
        - prolonged-outofsync-message
```

## Testing Your Notification Setup

Verify that notifications are working by checking the notification controller logs.

```bash
# Check the notifications controller logs
kubectl -n argocd logs deployment/argocd-notifications-controller

# Manually trigger a test (force a sync failure)
argocd app sync my-app --revision nonexistent-branch
```

If notifications are not being sent, check for:

1. **Secret configuration**: Make sure the `argocd-notifications-secret` has the correct tokens
2. **Trigger conditions**: Verify the trigger expression matches your Application state
3. **Subscription annotations**: Confirm the Application has the right annotations
4. **Controller logs**: Look for errors in the notifications controller

With failure-only notifications configured, your team gets alerted when something actually needs attention, and the noise from successful deployments stays out of your alert channels.

# How to Send ArgoCD Notifications to Slack

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Slack, Notifications

Description: Learn how to configure ArgoCD to send deployment notifications to Slack channels with rich formatting, interactive buttons, and customizable triggers.

---

Slack is the most popular destination for ArgoCD notifications. Getting deployment alerts in the channels where your team already works means faster response times when things go wrong and better visibility into what is being deployed. This guide covers everything from creating the Slack bot to building rich notification messages with buttons and color coding.

## Creating a Slack Bot

Before configuring ArgoCD, you need a Slack bot with the right permissions.

1. Go to https://api.slack.com/apps and click "Create New App"
2. Choose "From scratch"
3. Name it something like "ArgoCD Notifications" and select your workspace
4. Go to "OAuth & Permissions" in the left sidebar
5. Under "Bot Token Scopes", add these scopes:
   - `chat:write` - Send messages
   - `chat:write.public` - Send messages to channels the bot is not a member of
   - `incoming-webhook` (optional) - If you prefer webhook-based delivery
6. Click "Install to Workspace" at the top of the OAuth page
7. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

## Configuring ArgoCD for Slack

Store the Slack token in the ArgoCD notifications secret:

```bash
# Create or update the secret with the Slack token
kubectl patch secret argocd-notifications-secret -n argocd \
  --type merge \
  -p '{"stringData": {"slack-token": "xoxb-your-bot-token-here"}}'
```

Configure the Slack service in the notifications ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Slack service configuration
  service.slack: |
    token: $slack-token
    signingSecret: $slack-signing-secret
```

The `$slack-token` reference is resolved from the `argocd-notifications-secret` automatically.

## Creating Slack Notification Templates

### Basic Text Template

Start with a simple text-based template:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.slack: |
    token: $slack-token

  template.app-sync-succeeded: |
    slack:
      attachments: |
        [{
          "color": "#18be52",
          "title": "{{ .app.metadata.name }} synced successfully",
          "text": "Application {{ .app.metadata.name }} has been synced to revision {{ .app.status.sync.revision | trunc 7 }}.",
          "fields": [
            {"title": "Project", "value": "{{ .app.spec.project }}", "short": true},
            {"title": "Cluster", "value": "{{ .app.spec.destination.server }}", "short": true},
            {"title": "Namespace", "value": "{{ .app.spec.destination.namespace }}", "short": true},
            {"title": "Health", "value": "{{ .app.status.health.status }}", "short": true}
          ]
        }]

  template.app-sync-failed: |
    slack:
      attachments: |
        [{
          "color": "#E96D76",
          "title": "{{ .app.metadata.name }} sync failed",
          "text": "Sync operation for {{ .app.metadata.name }} has failed.\n{{ .app.status.operationState.message }}",
          "fields": [
            {"title": "Project", "value": "{{ .app.spec.project }}", "short": true},
            {"title": "Revision", "value": "{{ .app.status.sync.revision | trunc 7 }}", "short": true}
          ]
        }]

  template.app-health-degraded: |
    slack:
      attachments: |
        [{
          "color": "#f4c030",
          "title": "{{ .app.metadata.name }} health degraded",
          "text": "Application {{ .app.metadata.name }} health status is {{ .app.status.health.status }}.",
          "fields": [
            {"title": "Project", "value": "{{ .app.spec.project }}", "short": true},
            {"title": "Namespace", "value": "{{ .app.spec.destination.namespace }}", "short": true}
          ]
        }]
```

### Rich Template with Blocks API

Slack's Block Kit provides much richer formatting:

```yaml
  template.app-deployed: |
    slack:
      blocks: |
        [{
          "type": "header",
          "text": {
            "type": "plain_text",
            "text": "Deployment Successful"
          }
        },
        {
          "type": "section",
          "fields": [
            {"type": "mrkdwn", "text": "*Application:*\n{{ .app.metadata.name }}"},
            {"type": "mrkdwn", "text": "*Project:*\n{{ .app.spec.project }}"},
            {"type": "mrkdwn", "text": "*Revision:*\n{{ .app.status.sync.revision | trunc 7 }}"},
            {"type": "mrkdwn", "text": "*Namespace:*\n{{ .app.spec.destination.namespace }}"},
            {"type": "mrkdwn", "text": "*Health:*\n{{ .app.status.health.status }}"},
            {"type": "mrkdwn", "text": "*Sync Status:*\n{{ .app.status.sync.status }}"}
          ]
        },
        {
          "type": "actions",
          "elements": [
            {
              "type": "button",
              "text": {"type": "plain_text", "text": "View in ArgoCD"},
              "url": "https://argocd.example.com/applications/{{ .app.metadata.name }}"
            },
            {
              "type": "button",
              "text": {"type": "plain_text", "text": "View Diff"},
              "url": "https://argocd.example.com/applications/{{ .app.metadata.name }}?view=tree&resource="
            }
          ]
        }]
```

## Configuring Triggers

Define when notifications fire:

```yaml
  # Trigger definitions
  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
      send: [app-deployed]

  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [app-sync-failed]

  trigger.on-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      send: [app-health-degraded]

  trigger.on-sync-running: |
    - when: app.status.operationState.phase in ['Running']
      send: [app-sync-running]
```

## Subscribing Applications

### Per-Application Subscription

```bash
# Subscribe a specific app to Slack notifications
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-deployed.slack="deployments"

kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed.slack="deployments"

kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-health-degraded.slack="alerts"
```

The value after `.slack=` is the Slack channel name (without the `#` prefix).

### Default Subscriptions for All Applications

```yaml
  subscriptions: |
    - recipients:
        - slack:deployments
      triggers:
        - on-deployed
        - on-sync-failed
    - recipients:
        - slack:alerts
      triggers:
        - on-health-degraded
```

### Project-Level Subscriptions

Subscribe all applications in a project:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
  annotations:
    notifications.argoproj.io/subscribe.on-sync-failed.slack: "prod-alerts"
    notifications.argoproj.io/subscribe.on-deployed.slack: "prod-deployments"
spec:
  # ... project spec
```

## Sending to Multiple Channels

You can send to different channels based on the event type:

```bash
# Successful deployments go to a general channel
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-deployed.slack="deployments"

# Failures go to an alerts channel
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed.slack="alerts"

# Send to multiple channels for the same trigger using semicolons
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed.slack="alerts;team-backend"
```

## Sending Direct Messages

You can also send notifications to specific Slack users by using their user ID:

```bash
# DM a specific user (use Slack user ID, not username)
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed.slack="U01ABCDEF12"
```

## Testing and Debugging

```bash
# Check notification controller logs
kubectl logs -n argocd deploy/argocd-notifications-controller -f

# Common error messages:
# "channel_not_found" - Check channel name spelling
# "not_in_channel" - Invite the bot to the channel
# "invalid_auth" - Token is wrong or expired
# "missing_scope" - Bot needs additional OAuth scopes

# Verify the bot is in the channel
# In Slack: /invite @ArgoCD Notifications
```

If notifications are not showing up, verify the full chain:

1. The ConfigMap has the correct service, template, and trigger definitions
2. The Secret has the correct Slack token
3. The application has the correct subscription annotation
4. The trigger condition actually matches the current application state
5. The Slack bot has been invited to the target channel

For a complete overview of the ArgoCD notification system, see our guide on [setting up ArgoCD notifications from scratch](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-setup-from-scratch/view). For other notification targets, check out our guides on [Microsoft Teams](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-microsoft-teams/view) and [webhook endpoints](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-webhook-endpoints/view).

Slack notifications transform ArgoCD from a tool you have to actively check into one that keeps your team informed automatically. Start with basic sync success and failure alerts, then expand to health degradation and custom triggers as your team's needs evolve.

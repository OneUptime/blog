# How to Send ArgoCD Notifications to Mattermost

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Mattermost, Notifications

Description: Learn how to configure ArgoCD to send deployment notifications to Mattermost channels using incoming webhooks with attachment formatting and custom triggers.

---

Mattermost is a popular open-source alternative to Slack, especially in organizations that need self-hosted messaging for security or compliance reasons. Since Mattermost's webhook API is largely compatible with Slack's format, setting up ArgoCD notifications for Mattermost is straightforward. This guide covers the complete setup.

## Creating a Mattermost Incoming Webhook

1. Go to your Mattermost instance
2. Click the hamburger menu and select "Integrations"
3. Click "Incoming Webhooks"
4. Click "Add Incoming Webhook"
5. Fill in the details:
   - **Title**: ArgoCD Notifications
   - **Description**: Deployment notifications from ArgoCD
   - **Channel**: Select the target channel
   - **Lock to this channel**: Leave unchecked if you want to override the channel per message
6. Click "Save"
7. Copy the webhook URL

The URL looks like: `https://mattermost.example.com/hooks/xxxxxxxxxxxxxxxxxxxxxxxx`

## Configuring ArgoCD

Store the webhook URL in the secret:

```bash
kubectl patch secret argocd-notifications-secret -n argocd \
  --type merge \
  -p '{"stringData": {"mattermost-webhook-url": "https://mattermost.example.com/hooks/your-webhook-id"}}'
```

Configure the webhook service:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.webhook.mattermost: |
    url: $mattermost-webhook-url
    headers:
      - name: Content-Type
        value: application/json
```

## Creating Mattermost Templates

### Simple Text Message

```yaml
  template.mattermost-sync-succeeded: |
    webhook:
      mattermost:
        method: POST
        body: |
          {
            "username": "ArgoCD",
            "icon_url": "https://argoproj.github.io/argo-cd/assets/logo.png",
            "text": "#### Deployment Successful\n| Detail | Value |\n|:--|:--|\n| Application | {{ .app.metadata.name }} |\n| Project | {{ .app.spec.project }} |\n| Revision | `{{ .app.status.sync.revision | trunc 7 }}` |\n| Namespace | {{ .app.spec.destination.namespace }} |\n| Health | {{ .app.status.health.status }} |\n\n[View in ArgoCD](https://argocd.example.com/applications/{{ .app.metadata.name }})"
          }
```

### Attachment-Formatted Message

Mattermost supports Slack-style attachments:

```yaml
  template.mattermost-deploy-card: |
    webhook:
      mattermost:
        method: POST
        body: |
          {
            "username": "ArgoCD",
            "icon_url": "https://argoproj.github.io/argo-cd/assets/logo.png",
            "attachments": [{
              "color": "#18be52",
              "title": "{{ .app.metadata.name }} - Deployed Successfully",
              "title_link": "https://argocd.example.com/applications/{{ .app.metadata.name }}",
              "fields": [
                {"short": true, "title": "Project", "value": "{{ .app.spec.project }}"},
                {"short": true, "title": "Revision", "value": "`{{ .app.status.sync.revision | trunc 7 }}`"},
                {"short": true, "title": "Namespace", "value": "{{ .app.spec.destination.namespace }}"},
                {"short": true, "title": "Health", "value": "{{ .app.status.health.status }}"},
                {"short": true, "title": "Sync Status", "value": "{{ .app.status.sync.status }}"},
                {"short": true, "title": "Cluster", "value": "{{ .app.spec.destination.server }}"}
              ]
            }]
          }

  template.mattermost-sync-failed: |
    webhook:
      mattermost:
        method: POST
        body: |
          {
            "username": "ArgoCD",
            "icon_url": "https://argoproj.github.io/argo-cd/assets/logo.png",
            "attachments": [{
              "color": "#E96D76",
              "title": "{{ .app.metadata.name }} - Sync Failed",
              "title_link": "https://argocd.example.com/applications/{{ .app.metadata.name }}",
              "text": "{{ .app.status.operationState.message }}",
              "fields": [
                {"short": true, "title": "Project", "value": "{{ .app.spec.project }}"},
                {"short": true, "title": "Revision", "value": "`{{ .app.status.sync.revision | trunc 7 }}`"},
                {"short": true, "title": "Namespace", "value": "{{ .app.spec.destination.namespace }}"},
                {"short": true, "title": "Health", "value": "{{ .app.status.health.status }}"}
              ]
            }]
          }

  template.mattermost-health-degraded: |
    webhook:
      mattermost:
        method: POST
        body: |
          {
            "username": "ArgoCD",
            "icon_url": "https://argoproj.github.io/argo-cd/assets/logo.png",
            "attachments": [{
              "color": "#f4c030",
              "title": "{{ .app.metadata.name }} - Health Degraded",
              "title_link": "https://argocd.example.com/applications/{{ .app.metadata.name }}",
              "fields": [
                {"short": true, "title": "Health", "value": "{{ .app.status.health.status }}"},
                {"short": true, "title": "Sync", "value": "{{ .app.status.sync.status }}"},
                {"short": true, "title": "Namespace", "value": "{{ .app.spec.destination.namespace }}"},
                {"short": true, "title": "Project", "value": "{{ .app.spec.project }}"}
              ]
            }]
          }
```

## Sending to Specific Channels

Override the default channel per notification:

```yaml
  template.mattermost-prod-alert: |
    webhook:
      mattermost:
        method: POST
        body: |
          {
            "channel": "production-alerts",
            "username": "ArgoCD",
            "icon_url": "https://argoproj.github.io/argo-cd/assets/logo.png",
            "attachments": [{
              "color": "#E96D76",
              "title": "PRODUCTION: {{ .app.metadata.name }} sync failed",
              "text": "{{ .app.status.operationState.message }}"
            }]
          }

  template.mattermost-dev-notify: |
    webhook:
      mattermost:
        method: POST
        body: |
          {
            "channel": "dev-deploys",
            "username": "ArgoCD",
            "attachments": [{
              "color": "#18be52",
              "title": "{{ .app.metadata.name }} deployed",
              "text": "Revision: `{{ .app.status.sync.revision | trunc 7 }}`"
            }]
          }
```

## Configuring Triggers

```yaml
  trigger.on-deployed-mattermost: |
    - when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
      oncePer: app.status.sync.revision
      send: [mattermost-deploy-card]

  trigger.on-sync-failed-mattermost: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [mattermost-sync-failed]

  trigger.on-health-degraded-mattermost: |
    - when: app.status.health.status == 'Degraded'
      send: [mattermost-health-degraded]
```

## Subscribing Applications

```bash
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-deployed-mattermost.mattermost=""

kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed-mattermost.mattermost=""

kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-health-degraded-mattermost.mattermost=""
```

Default subscriptions for all applications:

```yaml
  subscriptions: |
    - recipients:
        - mattermost:
      triggers:
        - on-deployed-mattermost
        - on-sync-failed-mattermost
        - on-health-degraded-mattermost
```

## Mentioning Users and Channels

Mattermost supports @mentions in webhook messages:

```yaml
  template.mattermost-mention-oncall: |
    webhook:
      mattermost:
        method: POST
        body: |
          {
            "username": "ArgoCD",
            "text": "@channel Production deployment failed for **{{ .app.metadata.name }}**. Please investigate immediately.\n\n{{ .app.status.operationState.message }}",
            "attachments": [{
              "color": "#E96D76",
              "title": "{{ .app.metadata.name }}",
              "title_link": "https://argocd.example.com/applications/{{ .app.metadata.name }}"
            }]
          }
```

Note: For @mentions to work in webhook messages, the Mattermost system administrator must enable the "Enable integrations to override usernames" and "Enable integrations to override profile picture icons" settings.

## Using Mattermost Bot Account Instead

For more control, use a bot account with the Mattermost API instead of incoming webhooks:

```yaml
  service.webhook.mattermost-bot: |
    url: https://mattermost.example.com/api/v4/posts
    headers:
      - name: Content-Type
        value: application/json
      - name: Authorization
        value: Bearer $mattermost-bot-token

  template.mattermost-bot-deploy: |
    webhook:
      mattermost-bot:
        method: POST
        body: |
          {
            "channel_id": "your-channel-id",
            "message": "#### Deployment: {{ .app.metadata.name }}\n| Field | Value |\n|:--|:--|\n| Status | {{ .app.status.operationState.phase }} |\n| Revision | `{{ .app.status.sync.revision | trunc 7 }}` |\n| Health | {{ .app.status.health.status }} |"
          }
```

## Debugging

```bash
# Check notification controller logs
kubectl logs -n argocd deploy/argocd-notifications-controller -f

# Test the webhook directly
curl -X POST "https://mattermost.example.com/hooks/your-webhook-id" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test from ArgoCD"}'

# Common errors:
# "Invalid or missing channel" - Channel doesn't exist or bot can't post there
# "Webhooks are not enabled" - Mattermost admin needs to enable webhooks
# "Invalid webhook" - The webhook ID in the URL is wrong
```

For the complete notification setup, see our [ArgoCD notifications from scratch guide](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-setup-from-scratch/view). For other chat platforms, check out [Slack](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-slack/view) and [Rocket.Chat](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-rocketchat/view).

Mattermost integration gives self-hosted teams the same deployment notification experience that Slack users enjoy, while keeping all communication data within your own infrastructure.

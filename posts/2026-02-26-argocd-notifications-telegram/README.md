# How to Send ArgoCD Notifications to Telegram

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Telegram, Notifications

Description: Learn how to configure ArgoCD to send deployment notifications to Telegram groups and channels using the Telegram Bot API with formatted messages.

---

Telegram is a popular choice for DevOps notifications, especially for teams that prefer its speed and reliability over Slack. ArgoCD does not have a built-in Telegram service, but the webhook notification system makes it straightforward to send messages through the Telegram Bot API. This guide covers bot creation, ArgoCD configuration, and message formatting.

## Creating a Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` to BotFather
3. Choose a name for your bot (e.g., "ArgoCD Notifications")
4. Choose a username (e.g., `argocd_deploy_bot`)
5. BotFather will give you an API token - save it

Next, get the chat ID where you want to send messages:

For a group chat:
1. Add the bot to your group
2. Send a message in the group
3. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
4. Look for the `"chat":{"id": ...}` value in the response (it will be negative for groups)

For a channel:
1. Add the bot as an admin of your channel
2. The chat ID is `@your_channel_name` or you can use the numeric ID

## Configuring ArgoCD for Telegram

Store the bot token in the ArgoCD notifications secret:

```bash
kubectl patch secret argocd-notifications-secret -n argocd \
  --type merge \
  -p '{"stringData": {"telegram-bot-token": "123456789:ABCdefGhIJKlmnoPQRSTuvwxyz"}}'
```

Configure the webhook service:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.webhook.telegram: |
    url: https://api.telegram.org/bot$telegram-bot-token/sendMessage
    headers:
      - name: Content-Type
        value: application/json
```

## Creating Telegram Notification Templates

### Basic Text Message

```yaml
  template.telegram-sync-succeeded: |
    webhook:
      telegram:
        method: POST
        body: |
          {
            "chat_id": "-1001234567890",
            "parse_mode": "HTML",
            "text": "<b>Deployment Successful</b>\n\n<b>App:</b> {{ .app.metadata.name }}\n<b>Project:</b> {{ .app.spec.project }}\n<b>Revision:</b> <code>{{ .app.status.sync.revision | trunc 7 }}</code>\n<b>Namespace:</b> {{ .app.spec.destination.namespace }}\n<b>Health:</b> {{ .app.status.health.status }}\n\n<a href=\"https://argocd.example.com/applications/{{ .app.metadata.name }}\">View in ArgoCD</a>"
          }
```

### Formatted Messages with Emoji

Telegram supports HTML and Markdown formatting:

```yaml
  template.telegram-sync-failed: |
    webhook:
      telegram:
        method: POST
        body: |
          {
            "chat_id": "-1001234567890",
            "parse_mode": "HTML",
            "disable_web_page_preview": true,
            "text": "SYNC FAILED\n\n<b>Application:</b> {{ .app.metadata.name }}\n<b>Project:</b> {{ .app.spec.project }}\n<b>Revision:</b> <code>{{ .app.status.sync.revision | trunc 7 }}</code>\n<b>Namespace:</b> {{ .app.spec.destination.namespace }}\n\n<b>Error:</b>\n<pre>{{ .app.status.operationState.message }}</pre>\n\n<a href=\"https://argocd.example.com/applications/{{ .app.metadata.name }}\">Investigate in ArgoCD</a>"
          }

  template.telegram-health-degraded: |
    webhook:
      telegram:
        method: POST
        body: |
          {
            "chat_id": "-1001234567890",
            "parse_mode": "HTML",
            "text": "HEALTH DEGRADED\n\n<b>Application:</b> {{ .app.metadata.name }}\n<b>Status:</b> {{ .app.status.health.status }}\n<b>Namespace:</b> {{ .app.spec.destination.namespace }}\n<b>Sync:</b> {{ .app.status.sync.status }}\n\n<a href=\"https://argocd.example.com/applications/{{ .app.metadata.name }}\">View in ArgoCD</a>"
          }
```

### Sending to Multiple Chat IDs

If you want to send to different groups based on the event type, create separate templates:

```yaml
  template.telegram-prod-alert: |
    webhook:
      telegram:
        method: POST
        body: |
          {
            "chat_id": "-1001234567890",
            "parse_mode": "HTML",
            "text": "<b>PRODUCTION ALERT</b>\n\n{{ .app.metadata.name }} sync failed\n<pre>{{ .app.status.operationState.message }}</pre>"
          }

  # Second webhook for a different group
  service.webhook.telegram-dev: |
    url: https://api.telegram.org/bot$telegram-bot-token/sendMessage
    headers:
      - name: Content-Type
        value: application/json

  template.telegram-dev-notification: |
    webhook:
      telegram-dev:
        method: POST
        body: |
          {
            "chat_id": "-1009876543210",
            "parse_mode": "HTML",
            "text": "<b>Dev Deploy:</b> {{ .app.metadata.name }} synced to <code>{{ .app.status.sync.revision | trunc 7 }}</code>"
          }
```

## Dynamic Chat ID with Annotations

Instead of hardcoding the chat ID in templates, you can use application annotations to specify the target chat:

```yaml
  template.telegram-dynamic: |
    webhook:
      telegram:
        method: POST
        body: |
          {
            "chat_id": "{{ index .app.metadata.annotations "telegram-chat-id" }}",
            "parse_mode": "HTML",
            "text": "<b>{{ .app.metadata.name }}</b> - {{ .app.status.sync.status }}\nHealth: {{ .app.status.health.status }}"
          }
```

Then annotate your applications with the chat ID:

```bash
kubectl annotate app my-app -n argocd \
  telegram-chat-id="-1001234567890"
```

## Configuring Triggers

```yaml
  trigger.on-deployed-telegram: |
    - when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
      oncePer: app.status.sync.revision
      send: [telegram-sync-succeeded]

  trigger.on-sync-failed-telegram: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [telegram-sync-failed]

  trigger.on-health-degraded-telegram: |
    - when: app.status.health.status == 'Degraded'
      send: [telegram-health-degraded]
```

## Subscribing Applications

```bash
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-deployed-telegram.telegram=""

kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed-telegram.telegram=""
```

## Sending Images and Documents

Telegram supports sending photos and documents. You could send a deployment summary image:

```yaml
  service.webhook.telegram-photo: |
    url: https://api.telegram.org/bot$telegram-bot-token/sendPhoto
    headers:
      - name: Content-Type
        value: application/json

  template.telegram-deploy-screenshot: |
    webhook:
      telegram-photo:
        method: POST
        body: |
          {
            "chat_id": "-1001234567890",
            "photo": "https://argocd.example.com/api/badge?name={{ .app.metadata.name }}",
            "caption": "{{ .app.metadata.name }} deployed successfully"
          }
```

## Silent Messages

For non-critical notifications, send them silently (no notification sound):

```yaml
  template.telegram-info-silent: |
    webhook:
      telegram:
        method: POST
        body: |
          {
            "chat_id": "-1001234567890",
            "parse_mode": "HTML",
            "disable_notification": true,
            "text": "<b>Info:</b> {{ .app.metadata.name }} synced to <code>{{ .app.status.sync.revision | trunc 7 }}</code>"
          }
```

## Debugging

```bash
# Check notification controller logs
kubectl logs -n argocd deploy/argocd-notifications-controller -f

# Test the bot directly
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": "-1001234567890", "text": "Test from ArgoCD"}'

# Common errors:
# "chat not found" - Bot is not in the group or chat ID is wrong
# "Unauthorized" - Bot token is invalid
# "Bad Request: can't parse entities" - HTML/Markdown syntax error in template
```

For the complete notification setup guide, see [ArgoCD notifications from scratch](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-setup-from-scratch/view). For other notification channels, check out our guides on [Slack](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-slack/view) and [webhook endpoints](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-webhook-endpoints/view).

Telegram notifications are lightweight, fast, and work well for teams that want real-time deployment alerts on their mobile devices. The rich HTML formatting and silent message options give you control over how noisy the notifications are.

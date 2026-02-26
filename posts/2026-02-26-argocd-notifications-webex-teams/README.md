# How to Send ArgoCD Notifications to Webex Teams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Webex, Notifications

Description: Learn how to configure ArgoCD to send deployment notifications to Cisco Webex Teams spaces using the Webex API with adaptive card formatting.

---

Cisco Webex Teams (now just called Webex) is the messaging platform of choice for many enterprise environments, particularly in organizations that use Cisco infrastructure. Sending ArgoCD deployment notifications to Webex spaces keeps your team informed about deployments in the tool they already use. This guide covers the complete setup using the Webex API.

## Creating a Webex Bot

1. Go to https://developer.webex.com/my-apps
2. Click "Create a Bot"
3. Fill in the details:
   - **Bot Name**: ArgoCD Notifications
   - **Bot Username**: argocd-deploy (or your preferred handle)
   - **Description**: Sends deployment notifications from ArgoCD
   - **Icon**: Upload an ArgoCD logo or use the default
4. Click "Create"
5. Copy the **Bot Access Token** - you will need this for ArgoCD

Next, get the Room ID where you want to send messages:

```bash
# List rooms the bot belongs to
curl -X GET https://webexapis.com/v1/rooms \
  -H "Authorization: Bearer YOUR_BOT_TOKEN"
```

Add the bot to the target space first by searching for it in Webex and adding it to the room.

## Configuring ArgoCD

Store the bot token and room ID in the secret:

```bash
kubectl patch secret argocd-notifications-secret -n argocd \
  --type merge \
  -p '{"stringData": {
    "webex-bot-token": "YOUR_BOT_ACCESS_TOKEN",
    "webex-room-id": "YOUR_ROOM_ID"
  }}'
```

Configure the webhook service:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.webhook.webex: |
    url: https://webexapis.com/v1/messages
    headers:
      - name: Content-Type
        value: application/json
      - name: Authorization
        value: Bearer $webex-bot-token
```

## Creating Webex Notification Templates

### Simple Markdown Message

Webex supports Markdown in messages:

```yaml
  template.webex-sync-succeeded: |
    webhook:
      webex:
        method: POST
        body: |
          {
            "roomId": "$webex-room-id",
            "markdown": "### Deployment Successful\n\n| Detail | Value |\n|:--|:--|\n| **Application** | {{ .app.metadata.name }} |\n| **Project** | {{ .app.spec.project }} |\n| **Revision** | `{{ .app.status.sync.revision | trunc 7 }}` |\n| **Namespace** | {{ .app.spec.destination.namespace }} |\n| **Health** | {{ .app.status.health.status }} |\n\n[View in ArgoCD](https://argocd.example.com/applications/{{ .app.metadata.name }})"
          }

  template.webex-sync-failed: |
    webhook:
      webex:
        method: POST
        body: |
          {
            "roomId": "$webex-room-id",
            "markdown": "### Sync Failed\n\n**Application:** {{ .app.metadata.name }}\n**Project:** {{ .app.spec.project }}\n**Revision:** `{{ .app.status.sync.revision | trunc 7 }}`\n\n**Error:**\n```\n{{ .app.status.operationState.message }}\n```\n\n[Investigate in ArgoCD](https://argocd.example.com/applications/{{ .app.metadata.name }})"
          }
```

### Adaptive Card Message

Webex supports Adaptive Cards for richer formatting:

```yaml
  template.webex-deploy-card: |
    webhook:
      webex:
        method: POST
        body: |
          {
            "roomId": "$webex-room-id",
            "text": "Deployment: {{ .app.metadata.name }} - {{ .app.status.operationState.phase }}",
            "attachments": [{
              "contentType": "application/vnd.microsoft.card.adaptive",
              "content": {
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "type": "AdaptiveCard",
                "version": "1.2",
                "body": [
                  {
                    "type": "TextBlock",
                    "text": "Deployment Successful",
                    "weight": "Bolder",
                    "size": "Large",
                    "color": "Good"
                  },
                  {
                    "type": "FactSet",
                    "facts": [
                      {"title": "Application", "value": "{{ .app.metadata.name }}"},
                      {"title": "Project", "value": "{{ .app.spec.project }}"},
                      {"title": "Revision", "value": "{{ .app.status.sync.revision | trunc 7 }}"},
                      {"title": "Namespace", "value": "{{ .app.spec.destination.namespace }}"},
                      {"title": "Health", "value": "{{ .app.status.health.status }}"},
                      {"title": "Sync Status", "value": "{{ .app.status.sync.status }}"}
                    ]
                  },
                  {
                    "type": "ActionSet",
                    "actions": [{
                      "type": "Action.OpenUrl",
                      "title": "View in ArgoCD",
                      "url": "https://argocd.example.com/applications/{{ .app.metadata.name }}"
                    }]
                  }
                ]
              }
            }]
          }

  template.webex-failure-card: |
    webhook:
      webex:
        method: POST
        body: |
          {
            "roomId": "$webex-room-id",
            "text": "Sync Failed: {{ .app.metadata.name }}",
            "attachments": [{
              "contentType": "application/vnd.microsoft.card.adaptive",
              "content": {
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "type": "AdaptiveCard",
                "version": "1.2",
                "body": [
                  {
                    "type": "TextBlock",
                    "text": "Sync Failed",
                    "weight": "Bolder",
                    "size": "Large",
                    "color": "Attention"
                  },
                  {
                    "type": "FactSet",
                    "facts": [
                      {"title": "Application", "value": "{{ .app.metadata.name }}"},
                      {"title": "Project", "value": "{{ .app.spec.project }}"},
                      {"title": "Revision", "value": "{{ .app.status.sync.revision | trunc 7 }}"}
                    ]
                  },
                  {
                    "type": "TextBlock",
                    "text": "Error Details",
                    "weight": "Bolder"
                  },
                  {
                    "type": "TextBlock",
                    "text": "{{ .app.status.operationState.message }}",
                    "wrap": true,
                    "fontType": "Monospace",
                    "size": "Small"
                  },
                  {
                    "type": "ActionSet",
                    "actions": [{
                      "type": "Action.OpenUrl",
                      "title": "Investigate",
                      "url": "https://argocd.example.com/applications/{{ .app.metadata.name }}"
                    }]
                  }
                ]
              }
            }]
          }
```

## Configuring Triggers

```yaml
  trigger.on-deployed-webex: |
    - when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
      oncePer: app.status.sync.revision
      send: [webex-deploy-card]

  trigger.on-sync-failed-webex: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [webex-failure-card]

  trigger.on-health-degraded-webex: |
    - when: app.status.health.status == 'Degraded'
      send: [webex-sync-failed]
```

## Subscribing Applications

```bash
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-deployed-webex.webex=""

kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed-webex.webex=""
```

Default subscriptions:

```yaml
  subscriptions: |
    - recipients:
        - webex:
      triggers:
        - on-deployed-webex
        - on-sync-failed-webex
        - on-health-degraded-webex
```

## Multiple Webex Spaces

To send to different Webex spaces, create templates with different room IDs:

```yaml
  template.webex-prod-alert: |
    webhook:
      webex:
        method: POST
        body: |
          {
            "roomId": "$webex-prod-room-id",
            "markdown": "**PRODUCTION ALERT:** {{ .app.metadata.name }} sync failed\n\n{{ .app.status.operationState.message }}"
          }

  template.webex-dev-notify: |
    webhook:
      webex:
        method: POST
        body: |
          {
            "roomId": "$webex-dev-room-id",
            "markdown": "**Dev Deploy:** {{ .app.metadata.name }} synced to `{{ .app.status.sync.revision | trunc 7 }}`"
          }
```

## Mentioning People

Mention specific people in Webex messages using their email or person ID:

```yaml
  template.webex-mention-oncall: |
    webhook:
      webex:
        method: POST
        body: |
          {
            "roomId": "$webex-room-id",
            "markdown": "<@personEmail:oncall@example.com> Production deployment failed for **{{ .app.metadata.name }}**. Please investigate.\n\n```\n{{ .app.status.operationState.message }}\n```"
          }
```

## Debugging

```bash
# Check notification controller logs
kubectl logs -n argocd deploy/argocd-notifications-controller -f

# Test the Webex API directly
curl -X POST https://webexapis.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $WEBEX_BOT_TOKEN" \
  -d '{"roomId": "YOUR_ROOM_ID", "markdown": "Test from ArgoCD"}'

# Common errors:
# "Room not found" - Room ID is wrong or bot is not in the room
# "Not authorized" - Bot token is invalid or expired
# "Rate limited" - Too many messages too quickly (Webex rate limit is ~5 msg/sec)
```

For the complete ArgoCD notification setup, see our [notifications from scratch guide](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-setup-from-scratch/view). For other enterprise messaging platforms, check out our guides on [Microsoft Teams](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-microsoft-teams/view) and [Slack](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-slack/view).

Webex integration brings ArgoCD deployment visibility to your Cisco-based communication infrastructure. The adaptive card support gives you professional-looking notifications that match the Webex user experience.

# How to Send ArgoCD Notifications to Microsoft Teams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Microsoft Teams, Notification

Description: Learn how to configure ArgoCD to send deployment notifications to Microsoft Teams channels using Incoming Webhooks with adaptive card formatting.

---

Microsoft Teams is the default communication tool for many enterprises, and getting ArgoCD deployment alerts there keeps your team informed without switching contexts. ArgoCD supports Teams through its Teams Workflows notification service, which lets you send rich adaptive cards with deployment details, status colors, and action buttons.

## Setting Up the Teams Workflow Webhook

First, create a Teams Workflow webhook in your Teams channel:

1. Open Microsoft Teams and navigate to the channel where you want notifications
2. Click the three dots (...) next to the channel name
3. Select "Workflows"
4. Search for "Send webhook alerts to a channel"
5. Choose the team and channel
6. Configure the webhook name and settings
7. Copy the webhook URL - it looks like `https://api.powerautomate.com/...`, `https://api.powerplatform.com/...`, or `https://flow.microsoft.com/...`

Note: Microsoft has retired Office 365 Connectors in Teams. If you still have an old connector URL such as `https://outlook.office.com/webhook/...` or `https://webhook.office.com/...`, migrate it to a Teams Workflow webhook before using it with current ArgoCD versions.

## Configuring ArgoCD for Teams

Store the Teams Workflow webhook URL in the ArgoCD notifications secret:

```bash
kubectl patch secret argocd-notifications-secret -n argocd \
  --type merge \
  -p '{"stringData": {"teams-workflow-webhook-url": "https://api.powerautomate.com/your-workflow-webhook-url"}}'
```

Configure the Teams service in the notifications ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.teams-workflows: |
    recipientUrls:
      deployments-channel: $teams-workflow-webhook-url
```

The `recipientUrls` map lets you define multiple channels by name. The name you use here (`deployments-channel`) is what you reference in annotations.

## Creating Teams Notification Templates

### Basic Adaptive Card

Teams Workflows uses Adaptive Cards. ArgoCD converts the standard Teams template fields to Adaptive Card format:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.teams-workflows: |
    recipientUrls:
      deployments-channel: $teams-workflow-webhook-url
      alerts-channel: $teams-alerts-workflow-webhook-url

  template.app-sync-succeeded-teams: |
    teams-workflows:
      title: "Deployment Successful"
      text: "Application {{ .app.metadata.name }} synced to revision {{ .app.status.sync.revision | trunc 7 }}"
      themeColor: "Good"
      sections: |
        [{
          "facts": [
            {"name": "Project", "value": "{{ .app.spec.project }}"},
            {"name": "Namespace", "value": "{{ .app.spec.destination.namespace }}"},
            {"name": "Cluster", "value": "{{ .app.spec.destination.server }}"},
            {"name": "Health", "value": "{{ .app.status.health.status }}"},
            {"name": "Sync Status", "value": "{{ .app.status.sync.status }}"}
          ]
        }]
      potentialAction: |
        [{
          "@type": "OpenUri",
          "name": "View in ArgoCD",
          "targets": [{"os": "default", "uri": "https://argocd.example.com/applications/{{ .app.metadata.name }}"}]
        }]

  template.app-sync-failed-teams: |
    teams-workflows:
      title: "Deployment Failed"
      text: "Application {{ .app.metadata.name }} sync operation failed"
      themeColor: "Attention"
      sections: |
        [{
          "facts": [
            {"name": "Project", "value": "{{ .app.spec.project }}"},
            {"name": "Revision", "value": "{{ .app.status.sync.revision | trunc 7 }}"},
            {"name": "Error", "value": "{{ .app.status.operationState.message }}"}
          ]
        }]
      potentialAction: |
        [{
          "@type": "OpenUri",
          "name": "View in ArgoCD",
          "targets": [{"os": "default", "uri": "https://argocd.example.com/applications/{{ .app.metadata.name }}"}]
        }]

  template.app-health-degraded-teams: |
    teams-workflows:
      title: "Application Health Degraded"
      text: "Application {{ .app.metadata.name }} health status changed to {{ .app.status.health.status }}"
      themeColor: "Warning"
      sections: |
        [{
          "facts": [
            {"name": "Project", "value": "{{ .app.spec.project }}"},
            {"name": "Namespace", "value": "{{ .app.spec.destination.namespace }}"},
            {"name": "Health Status", "value": "{{ .app.status.health.status }}"},
            {"name": "Sync Status", "value": "{{ .app.status.sync.status }}"}
          ]
        }]
      potentialAction: |
        [{
          "@type": "OpenUri",
          "name": "View in ArgoCD",
          "targets": [{"os": "default", "uri": "https://argocd.example.com/applications/{{ .app.metadata.name }}"}]
        }]
```

### Custom Adaptive Card Template

For richer formatting, provide an Adaptive Card directly in the Teams Workflows template. ArgoCD wraps this card in the message envelope required by Teams:

```yaml
  service.teams-workflows: |
    recipientUrls:
      deployments-channel: $teams-workflow-webhook-url

  template.app-deployed-adaptive: |
    teams-workflows:
      adaptiveCard: |
        {
          "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
          "type": "AdaptiveCard",
          "version": "1.4",
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
                {"title": "Health", "value": "{{ .app.status.health.status }}"}
              ]
            }
          ],
          "actions": [
            {
              "type": "Action.OpenUrl",
              "title": "View in ArgoCD",
              "url": "https://argocd.example.com/applications/{{ .app.metadata.name }}"
            }
          ]
        }
```

If you use the generic webhook service instead, include the full Teams message envelope yourself:

```yaml
  service.webhook.teams-adaptive: |
    url: $teams-workflow-webhook-url
    headers:
      - name: Content-Type
        value: application/json

  template.app-deployed-adaptive-webhook: |
    webhook:
      teams-adaptive:
        method: POST
        body: |
          {
            "type": "message",
            "attachments": [{
              "contentType": "application/vnd.microsoft.card.adaptive",
              "content": {
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "type": "AdaptiveCard",
                "version": "1.4",
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
                      {"title": "Health", "value": "{{ .app.status.health.status }}"}
                    ]
                  }
                ],
                "actions": [
                  {
                    "type": "Action.OpenUrl",
                    "title": "View in ArgoCD",
                    "url": "https://argocd.example.com/applications/{{ .app.metadata.name }}"
                  }
                ]
              }
            }]
          }
```

## Configuring Triggers

```yaml
  trigger.on-deployed: |
    - when: app.status?.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
      oncePer: app.status.sync.revision
      send: [app-sync-succeeded-teams]

  trigger.on-sync-failed: |
    - when: app.status?.operationState.phase in ['Error', 'Failed']
      send: [app-sync-failed-teams]

  trigger.on-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      send: [app-health-degraded-teams]
```

## Subscribing Applications

```bash
# Subscribe an application to Teams notifications

kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-deployed.teams-workflows="deployments-channel"

kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed.teams-workflows="alerts-channel"
```

For default subscriptions that apply to all applications:

```yaml
  subscriptions: |
    - recipients:
        - teams-workflows:deployments-channel
      triggers:
        - on-deployed
        - on-sync-failed
        - on-health-degraded
```

## Multiple Teams Channels

To send to different channels for different event types, define multiple recipient URLs:

```yaml
  service.teams-workflows: |
    recipientUrls:
      deployments: $teams-deployments-workflow-webhook
      alerts: $teams-alerts-workflow-webhook
      sre-team: $teams-sre-workflow-webhook
```

Then reference them in annotations:

```bash
# Success notifications go to deployments channel
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-deployed.teams-workflows="deployments"

# Failures go to alerts channel
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed.teams-workflows="alerts"
```

## Debugging Teams Notifications

```bash
# Check the notification controller logs
kubectl logs -n argocd deploy/argocd-notifications-controller -f

# Common issues:
# "webhook returned non-200 status" - The webhook URL may be invalid or expired
# "connection refused" - Network policy blocking outbound traffic
# No logs at all - Check that the trigger condition matches
```

Test the webhook URL directly with curl to verify it works:

```bash
# Test the Teams webhook independently
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"type":"message","attachments":[{"contentType":"application/vnd.microsoft.card.adaptive","content":{"type":"AdaptiveCard","version":"1.4","body":[{"type":"TextBlock","text":"ArgoCD test notification","wrap":true}]}}]}' \
  "https://api.powerautomate.com/your-workflow-webhook-url"
```

If this works but ArgoCD notifications do not, the issue is in the ArgoCD configuration.

## Handling Webhook URL Rotation

Teams Workflow webhook URLs can change when workflows are deleted or channels are restructured. To rotate:

```bash
# Update the secret with the new webhook URL
kubectl patch secret argocd-notifications-secret -n argocd \
  --type merge \
  -p '{"stringData": {"teams-workflow-webhook-url": "https://api.powerautomate.com/new-workflow-webhook-url"}}'

# Restart the notification controller to pick up the change
kubectl rollout restart deployment argocd-notifications-controller -n argocd
```

For a broader overview of ArgoCD notifications, see our [setup guide](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-setup-from-scratch/view). For other notification targets, check out our guides on [Slack](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-slack/view) and [PagerDuty](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-pagerduty/view).

Teams notifications keep your entire organization informed about deployment activity without requiring everyone to have ArgoCD access. The color-coded cards make it easy to spot failures at a glance, and action buttons let team members jump directly to ArgoCD when they need to investigate.

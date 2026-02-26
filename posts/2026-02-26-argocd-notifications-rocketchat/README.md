# How to Send ArgoCD Notifications to Rocket.Chat

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Rocket.Chat, Notifications

Description: Learn how to configure ArgoCD to send deployment notifications to Rocket.Chat channels using incoming webhooks with rich attachment formatting.

---

Rocket.Chat is another popular open-source messaging platform that many organizations self-host for compliance and data sovereignty reasons. Like Mattermost, Rocket.Chat supports incoming webhooks with a Slack-compatible attachment format, making it straightforward to integrate with ArgoCD notifications.

## Setting Up Rocket.Chat Incoming Webhook

1. Log into Rocket.Chat as an admin
2. Go to Administration and then Integrations
3. Click "New Integration"
4. Select "Incoming WebHook"
5. Configure it:
   - **Enabled**: True
   - **Name**: ArgoCD Notifications
   - **Post to Channel**: #deployments (or your preferred channel)
   - **Post as**: ArgoCD
   - **Avatar URL**: https://argoproj.github.io/argo-cd/assets/logo.png
   - **Script Enabled**: False (we handle formatting in ArgoCD templates)
6. Save and copy the "Webhook URL"

The URL looks like: `https://rocketchat.example.com/hooks/token/webhook-id`

## Configuring ArgoCD

Store the webhook URL:

```bash
kubectl patch secret argocd-notifications-secret -n argocd \
  --type merge \
  -p '{"stringData": {"rocketchat-webhook-url": "https://rocketchat.example.com/hooks/your-token/your-webhook-id"}}'
```

Configure the webhook service:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.webhook.rocketchat: |
    url: $rocketchat-webhook-url
    headers:
      - name: Content-Type
        value: application/json
```

## Creating Rocket.Chat Templates

### Text with Markdown

Rocket.Chat supports Markdown in webhook messages:

```yaml
  template.rocketchat-sync-succeeded: |
    webhook:
      rocketchat:
        method: POST
        body: |
          {
            "alias": "ArgoCD",
            "avatar": "https://argoproj.github.io/argo-cd/assets/logo.png",
            "text": "### Deployment Successful\n**Application:** {{ .app.metadata.name }}\n**Project:** {{ .app.spec.project }}\n**Revision:** `{{ .app.status.sync.revision | trunc 7 }}`\n**Namespace:** {{ .app.spec.destination.namespace }}\n**Health:** {{ .app.status.health.status }}\n\n[View in ArgoCD](https://argocd.example.com/applications/{{ .app.metadata.name }})"
          }
```

### Attachment-Formatted Messages

Rocket.Chat supports Slack-compatible attachment format:

```yaml
  template.rocketchat-deploy-card: |
    webhook:
      rocketchat:
        method: POST
        body: |
          {
            "alias": "ArgoCD",
            "avatar": "https://argoproj.github.io/argo-cd/assets/logo.png",
            "attachments": [{
              "color": "#18be52",
              "title": "{{ .app.metadata.name }} - Deployed",
              "title_link": "https://argocd.example.com/applications/{{ .app.metadata.name }}",
              "fields": [
                {"short": true, "title": "Project", "value": "{{ .app.spec.project }}"},
                {"short": true, "title": "Revision", "value": "`{{ .app.status.sync.revision | trunc 7 }}`"},
                {"short": true, "title": "Namespace", "value": "{{ .app.spec.destination.namespace }}"},
                {"short": true, "title": "Health", "value": "{{ .app.status.health.status }}"},
                {"short": true, "title": "Sync Status", "value": "{{ .app.status.sync.status }}"},
                {"short": true, "title": "Cluster", "value": "{{ .app.spec.destination.server }}"}
              ],
              "ts": "{{ .app.status.operationState.finishedAt }}"
            }]
          }

  template.rocketchat-sync-failed: |
    webhook:
      rocketchat:
        method: POST
        body: |
          {
            "alias": "ArgoCD",
            "avatar": "https://argoproj.github.io/argo-cd/assets/logo.png",
            "attachments": [{
              "color": "#E96D76",
              "title": "{{ .app.metadata.name }} - Sync Failed",
              "title_link": "https://argocd.example.com/applications/{{ .app.metadata.name }}",
              "text": "{{ .app.status.operationState.message }}",
              "fields": [
                {"short": true, "title": "Project", "value": "{{ .app.spec.project }}"},
                {"short": true, "title": "Revision", "value": "`{{ .app.status.sync.revision | trunc 7 }}`"},
                {"short": true, "title": "Namespace", "value": "{{ .app.spec.destination.namespace }}"}
              ]
            }]
          }

  template.rocketchat-health-degraded: |
    webhook:
      rocketchat:
        method: POST
        body: |
          {
            "alias": "ArgoCD",
            "avatar": "https://argoproj.github.io/argo-cd/assets/logo.png",
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

Override the default channel in the message:

```yaml
  template.rocketchat-prod-alert: |
    webhook:
      rocketchat:
        method: POST
        body: |
          {
            "channel": "#production-alerts",
            "alias": "ArgoCD",
            "attachments": [{
              "color": "#E96D76",
              "title": "PRODUCTION: {{ .app.metadata.name }} failed",
              "text": "{{ .app.status.operationState.message }}"
            }]
          }

  template.rocketchat-dev-notify: |
    webhook:
      rocketchat:
        method: POST
        body: |
          {
            "channel": "#dev-deploys",
            "alias": "ArgoCD",
            "attachments": [{
              "color": "#18be52",
              "title": "{{ .app.metadata.name }} deployed to {{ .app.spec.destination.namespace }}",
              "text": "Revision: `{{ .app.status.sync.revision | trunc 7 }}`"
            }]
          }
```

## Configuring Triggers

```yaml
  trigger.on-deployed-rocketchat: |
    - when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
      oncePer: app.status.sync.revision
      send: [rocketchat-deploy-card]

  trigger.on-sync-failed-rocketchat: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [rocketchat-sync-failed]

  trigger.on-health-degraded-rocketchat: |
    - when: app.status.health.status == 'Degraded'
      send: [rocketchat-health-degraded]
```

## Subscribing Applications

```bash
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-deployed-rocketchat.rocketchat=""

kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed-rocketchat.rocketchat=""
```

For default subscriptions:

```yaml
  subscriptions: |
    - recipients:
        - rocketchat:
      triggers:
        - on-deployed-rocketchat
        - on-sync-failed-rocketchat
        - on-health-degraded-rocketchat
```

## Using Rocket.Chat REST API Instead

For more advanced use cases like sending to direct messages or private groups, use the Rocket.Chat REST API with a bot user:

```yaml
  service.webhook.rocketchat-api: |
    url: https://rocketchat.example.com/api/v1/chat.postMessage
    headers:
      - name: Content-Type
        value: application/json
      - name: X-Auth-Token
        value: $rocketchat-auth-token
      - name: X-User-Id
        value: $rocketchat-user-id

  template.rocketchat-api-deploy: |
    webhook:
      rocketchat-api:
        method: POST
        body: |
          {
            "channel": "#deployments",
            "text": "",
            "attachments": [{
              "color": "#18be52",
              "title": "{{ .app.metadata.name }} deployed",
              "fields": [
                {"short": true, "title": "Revision", "value": "`{{ .app.status.sync.revision | trunc 7 }}`"},
                {"short": true, "title": "Health", "value": "{{ .app.status.health.status }}"}
              ]
            }]
          }
```

To get the auth token and user ID, create a bot user in Rocket.Chat and use the login API:

```bash
curl -X POST https://rocketchat.example.com/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username": "argocd-bot", "password": "bot-password"}'
```

## Debugging

```bash
# Check notification controller logs
kubectl logs -n argocd deploy/argocd-notifications-controller -f

# Test the webhook
curl -X POST "$ROCKETCHAT_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test from ArgoCD"}'

# Common issues:
# "Integration disabled" - The incoming webhook is not enabled
# "channel_not_found" - Channel does not exist or bot cannot access it
# "error-not-allowed" - Webhook is restricted to specific channels
```

For the full notification setup, see our [ArgoCD notifications from scratch guide](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-setup-from-scratch/view). For similar self-hosted platforms, see our [Mattermost guide](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-mattermost/view).

Rocket.Chat gives you full control over your messaging infrastructure, and integrating it with ArgoCD ensures your team gets deployment notifications without relying on external services.

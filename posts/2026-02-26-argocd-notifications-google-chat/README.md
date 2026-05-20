# How to Send ArgoCD Notifications to Google Chat

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Google Chat, Notification

Description: Learn how to configure ArgoCD to send deployment notifications to Google Chat spaces using incoming webhooks with card-formatted messages.

---

Google Chat (formerly Google Hangouts Chat) is the default messaging platform for teams using Google Workspace. If your organization uses Google Chat for team communication, sending ArgoCD deployment notifications there keeps everyone informed without switching tools. This guide covers setting up webhooks and creating well-formatted card messages.

## Creating a Google Chat Webhook

1. Open Google Chat
2. Navigate to the space where you want notifications
3. Click the space name at the top to open settings
4. Select "Manage webhooks" (or "Apps & integrations" then "Manage webhooks")
5. Click "Add another" if you already have webhooks, or "Create"
6. Name it "ArgoCD" and optionally set an avatar URL
7. Copy the webhook URL

The URL looks like: `https://chat.googleapis.com/v1/spaces/XXXXX/messages?key=XXXXX&token=XXXXX`

## Configuring ArgoCD for Google Chat

Store the webhook URL in the ArgoCD notifications secret:

```bash
kubectl patch secret argocd-notifications-secret -n argocd \
  --type merge \
  -p '{"stringData": {"google-chat-webhook-url": "https://chat.googleapis.com/v1/spaces/XXXXX/messages?key=XXXXX&token=XXXXX"}}'
```

Configure the webhook service:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.webhook.google-chat: |
    url: $google-chat-webhook-url
    headers:
      - name: Content-Type
        value: application/json
```

## Creating Google Chat Templates

### Simple Text Message

```yaml
  template.gchat-sync-succeeded: |
    webhook:
      google-chat:
        method: POST
        body: |
          {
            "text": "Deployment Successful: *{{ .app.metadata.name }}*\nRevision: `{{ .app.status.sync.revision | trunc 7 }}`\nNamespace: {{ .app.spec.destination.namespace }}\nHealth: {{ .app.status.health.status }}"
          }
```

### Card-Formatted Message

Google Chat supports a card-based UI for richer messages:

```yaml
  template.gchat-deploy-card: |
    webhook:
      google-chat:
        method: POST
        body: |
          {
            "cardsV2": [{
              "cardId": "argocd-deploy-{{ .app.metadata.name }}",
              "card": {
                "header": {
                  "title": "ArgoCD Deployment",
                  "subtitle": "{{ .app.metadata.name }}",
                  "imageUrl": "https://argoproj.github.io/argo-cd/assets/logo.png"
                },
                "sections": [{
                  "header": "Deployment Details",
                  "widgets": [
                    {
                      "decoratedText": {
                        "topLabel": "Application",
                        "text": "{{ .app.metadata.name }}"
                      }
                    },
                    {
                      "decoratedText": {
                        "topLabel": "Project",
                        "text": "{{ .app.spec.project }}"
                      }
                    },
                    {
                      "decoratedText": {
                        "topLabel": "Revision",
                        "text": "{{ .app.status.sync.revision | trunc 7 }}"
                      }
                    },
                    {
                      "decoratedText": {
                        "topLabel": "Namespace",
                        "text": "{{ .app.spec.destination.namespace }}"
                      }
                    },
                    {
                      "decoratedText": {
                        "topLabel": "Health",
                        "text": "{{ .app.status.health.status }}"
                      }
                    },
                    {
                      "decoratedText": {
                        "topLabel": "Sync Status",
                        "text": "{{ .app.status.sync.status }}"
                      }
                    },
                    {
                      "buttonList": {
                        "buttons": [{
                          "text": "View in ArgoCD",
                          "onClick": {
                            "openLink": {
                              "url": "https://argocd.example.com/applications/{{ .app.metadata.name }}"
                            }
                          }
                        }]
                      }
                    }
                  ]
                }]
              }
            }]
          }
```

### Sync Failure Card

```yaml
  template.gchat-sync-failed: |
    webhook:
      google-chat:
        method: POST
        body: |
          {
            "cardsV2": [{
              "cardId": "argocd-sync-failed-{{ .app.metadata.name }}",
              "card": {
                "header": {
                  "title": "Sync Failed",
                  "subtitle": "{{ .app.metadata.name }}",
                  "imageUrl": "https://argoproj.github.io/argo-cd/assets/logo.png"
                },
                "sections": [{
                  "header": "Failure Details",
                  "widgets": [
                    {
                      "decoratedText": {
                        "topLabel": "Application",
                        "text": "{{ .app.metadata.name }}"
                      }
                    },
                    {
                      "decoratedText": {
                        "topLabel": "Project",
                        "text": "{{ .app.spec.project }}"
                      }
                    },
                    {
                      "decoratedText": {
                        "topLabel": "Revision",
                        "text": "{{ .app.status.sync.revision | trunc 7 }}"
                      }
                    },
                    {
                      "textParagraph": {
                        "text": "<b>Error:</b> {{ .app.status.operationState.message }}"
                      }
                    },
                    {
                      "buttonList": {
                        "buttons": [{
                          "text": "Investigate",
                          "onClick": {
                            "openLink": {
                              "url": "https://argocd.example.com/applications/{{ .app.metadata.name }}"
                            }
                          }
                        }]
                      }
                    }
                  ]
                }]
              }
            }]
          }
```

### Using a Compact Cards v2 Format

Google Chat uses Cards v2 for modern-looking card messages:

```yaml
  template.gchat-deploy-v2: |
    webhook:
      google-chat:
        method: POST
        body: |
          {
            "cardsV2": [{
              "cardId": "argocd-deploy-{{ .app.metadata.name }}",
              "card": {
                "header": {
                  "title": "Deployment Successful",
                  "subtitle": "{{ .app.metadata.name }}",
                  "imageUrl": "https://argoproj.github.io/argo-cd/assets/logo.png",
                  "imageType": "CIRCLE"
                },
                "sections": [{
                  "header": "Details",
                  "collapsible": false,
                  "widgets": [
                    {
                      "decoratedText": {
                        "topLabel": "Application",
                        "text": "{{ .app.metadata.name }}"
                      }
                    },
                    {
                      "decoratedText": {
                        "topLabel": "Revision",
                        "text": "{{ .app.status.sync.revision | trunc 7 }}"
                      }
                    },
                    {
                      "decoratedText": {
                        "topLabel": "Namespace",
                        "text": "{{ .app.spec.destination.namespace }}"
                      }
                    },
                    {
                      "buttonList": {
                        "buttons": [{
                          "text": "View in ArgoCD",
                          "onClick": {
                            "openLink": {
                              "url": "https://argocd.example.com/applications/{{ .app.metadata.name }}"
                            }
                          }
                        }]
                      }
                    }
                  ]
                }]
              }
            }]
          }
```

## Configuring Triggers

```yaml
  trigger.on-deployed-gchat: |
    - when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
      oncePer: app.status.sync.revision
      send: [gchat-deploy-card]

  trigger.on-sync-failed-gchat: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [gchat-sync-failed]
```

## Subscribing Applications

```bash
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-deployed-gchat.google-chat=""

kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed-gchat.google-chat=""
```

## Multiple Google Chat Spaces

For sending to different spaces, create separate webhook services:

```yaml
  service.webhook.gchat-prod: |
    url: $gchat-prod-webhook-url
    headers:
      - name: Content-Type
        value: application/json

  service.webhook.gchat-dev: |
    url: $gchat-dev-webhook-url
    headers:
      - name: Content-Type
        value: application/json
```

## Threaded Messages

Google Chat supports threaded conversations for incoming webhooks. To send follow-up messages in the same thread, add `messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD` to the webhook URL and include a stable `thread.threadKey` value in the message body, such as the ArgoCD application name. Without a stable thread key, each notification is sent as a separate message.

## Debugging

```bash
# Check controller logs

kubectl logs -n argocd deploy/argocd-notifications-controller -f

# Test the webhook directly
curl -X POST "$GOOGLE_CHAT_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test from ArgoCD"}'

# Common errors:
# "Webhook not found" - URL is invalid or webhook was deleted
# "Request had invalid authentication credentials" - Key or token in URL is invalid
# "Invalid JSON payload" - Template generated invalid JSON
```

For the full notification setup walkthrough, see our [ArgoCD notifications from scratch guide](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-setup-from-scratch/view). For other messaging platforms, check out [Slack](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-slack/view) and [Microsoft Teams](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-microsoft-teams/view).

Google Chat integration keeps your Google Workspace team in the loop about deployments. The card format provides a clean, structured view of deployment information that is easy to scan in a busy chat space.

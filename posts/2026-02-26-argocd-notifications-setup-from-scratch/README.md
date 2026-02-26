# How to Set Up ArgoCD Notifications from Scratch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Notifications, DevOps

Description: A complete step-by-step guide to setting up ArgoCD notifications from scratch, covering installation, configuration, triggers, templates, and connecting your first notification service.

---

ArgoCD notifications let you send alerts when deployment events happen - syncs succeed, fail, applications become unhealthy, or drift is detected. The notification system is built into ArgoCD (since v2.3), but setting it up from zero can be confusing because the documentation assumes you already understand the architecture. This guide walks through every step from a clean ArgoCD installation to working notifications.

## Architecture Overview

ArgoCD notifications consist of three main components:

```mermaid
graph LR
    A[ArgoCD Application] -->|Events| B[Notification Controller]
    B -->|Evaluates| C[Triggers]
    C -->|Matches| D[Templates]
    D -->|Sends via| E[Services]
    E --> F[Slack]
    E --> G[Email]
    E --> H[Webhook]
    E --> I[Other Services]
```

- **Triggers**: Conditions that determine when to send notifications (e.g., "sync succeeded")
- **Templates**: The message format and content
- **Services**: The delivery channels (Slack, email, webhook, etc.)
- **Subscriptions**: Which applications use which triggers and services

All configuration lives in two ConfigMaps and one Secret in the `argocd` namespace.

## Step 1: Verify Notification Controller is Running

If you installed ArgoCD v2.3 or later, the notification controller should already be deployed. Verify it:

```bash
# Check if the notification controller is running
kubectl get pods -n argocd -l app.kubernetes.io/component=notifications-controller

# Expected output:
# argocd-notifications-controller-xxx   1/1   Running   0   5d
```

If it is not running, you may need to install it separately. With the Helm chart:

```yaml
# values.yaml
notifications:
  enabled: true
```

With plain manifests:

```bash
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

## Step 2: Understanding the Configuration Resources

ArgoCD notifications use three Kubernetes resources:

```bash
# ConfigMap for triggers, templates, and service configurations
kubectl get configmap argocd-notifications-cm -n argocd

# Secret for sensitive service credentials (tokens, passwords)
kubectl get secret argocd-notifications-secret -n argocd

# The catalog ConfigMap (optional, for built-in templates)
kubectl get configmap argocd-notifications-catalog -n argocd
```

If the ConfigMap does not exist yet, create it:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data: {}
---
apiVersion: v1
kind: Secret
metadata:
  name: argocd-notifications-secret
  namespace: argocd
type: Opaque
data: {}
```

Apply these:

```bash
kubectl apply -f argocd-notifications-config.yaml
```

## Step 3: Configure a Notification Service

Let us start with a simple webhook service to verify everything works before connecting Slack or email. Webhooks let you test without needing external service credentials:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Define a webhook service
  service.webhook.test-webhook: |
    url: https://webhook.site/your-unique-id
    headers:
      - name: Content-Type
        value: application/json
```

For a real setup with Slack, you would configure it like this:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.slack: |
    token: $slack-token
---
apiVersion: v1
kind: Secret
metadata:
  name: argocd-notifications-secret
  namespace: argocd
type: Opaque
stringData:
  slack-token: xoxb-your-slack-bot-token
```

## Step 4: Create a Notification Template

Templates define what the notification message looks like. Start with a simple one:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.webhook.test-webhook: |
    url: https://webhook.site/your-unique-id
    headers:
      - name: Content-Type
        value: application/json

  # Define a template
  template.app-sync-status: |
    webhook:
      test-webhook:
        method: POST
        body: |
          {
            "app": "{{.app.metadata.name}}",
            "status": "{{.app.status.sync.status}}",
            "health": "{{.app.status.health.status}}",
            "revision": "{{.app.status.sync.revision}}",
            "message": "Application {{.app.metadata.name}} sync status is {{.app.status.sync.status}}"
          }
```

Templates use Go templating. You have access to the full application object through `{{.app}}`.

## Step 5: Create Triggers

Triggers define when notifications are sent. They evaluate conditions against the application state:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.webhook.test-webhook: |
    url: https://webhook.site/your-unique-id
    headers:
      - name: Content-Type
        value: application/json

  template.app-sync-status: |
    webhook:
      test-webhook:
        method: POST
        body: |
          {
            "app": "{{.app.metadata.name}}",
            "status": "{{.app.status.sync.status}}",
            "health": "{{.app.status.health.status}}",
            "revision": "{{.app.status.sync.revision}}"
          }

  # Define triggers
  trigger.on-sync-succeeded: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [app-sync-status]

  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [app-sync-status]

  trigger.on-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      send: [app-sync-status]
```

## Step 6: Subscribe Applications

The final step is telling ArgoCD which applications should receive notifications. You do this with annotations on the Application resource:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
  annotations:
    # Subscribe to on-sync-succeeded trigger, send to test-webhook
    notifications.argoproj.io/subscribe.on-sync-succeeded.test-webhook: ""
    # Subscribe to on-sync-failed trigger
    notifications.argoproj.io/subscribe.on-sync-failed.test-webhook: ""
    # Subscribe to health degraded trigger
    notifications.argoproj.io/subscribe.on-health-degraded.test-webhook: ""
spec:
  # ... application spec
```

Or add annotations to an existing application:

```bash
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-sync-succeeded.test-webhook=""

kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed.test-webhook=""
```

## Step 7: Test Your Setup

Trigger a sync to verify notifications are working:

```bash
# Sync the application
argocd app sync my-app

# Check notification controller logs for delivery status
kubectl logs -n argocd deploy/argocd-notifications-controller --tail=50

# Look for lines like:
# Successfully sent notification
# or
# Failed to send notification
```

## Using Built-in Triggers and Templates

ArgoCD ships with a catalog of pre-built triggers and templates. Enable them by adding the catalog:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Reference built-in triggers
  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
      send: [app-deployed]

  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [app-sync-failed]

  trigger.on-sync-status-unknown: |
    - when: app.status.sync.status == 'Unknown'
      send: [app-sync-status-unknown]

  trigger.on-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      send: [app-health-degraded]
```

## Default Subscriptions

Instead of annotating every application, you can set up default subscriptions that apply to all applications:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Default subscriptions (apply to all apps)
  subscriptions: |
    - recipients:
        - slack:deployments-channel
      triggers:
        - on-sync-succeeded
        - on-sync-failed
        - on-health-degraded
```

## Debugging Notifications

When notifications are not working, check these things:

```bash
# Check controller logs
kubectl logs -n argocd deploy/argocd-notifications-controller -f

# Verify the ConfigMap is correct
kubectl get configmap argocd-notifications-cm -n argocd -o yaml

# Verify the Secret has the right keys
kubectl get secret argocd-notifications-secret -n argocd -o jsonpath='{.data}' | jq

# Check if the application has the right annotations
kubectl get app my-app -n argocd -o jsonpath='{.metadata.annotations}' | jq

# Restart the notification controller after config changes
kubectl rollout restart deployment argocd-notifications-controller -n argocd
```

Common issues:

- **Template syntax errors**: The controller log will show parsing errors
- **Missing secret references**: If a template references `$slack-token` but the secret does not have it, delivery fails silently
- **Wrong annotation format**: The annotation must follow the exact format `notifications.argoproj.io/subscribe.<trigger>.<service>`
- **Trigger condition never matches**: Double-check the `when` condition with your actual application status

For more specific notification service integrations, check out our guides on [sending notifications to Microsoft Teams](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-microsoft-teams/view), [PagerDuty](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-pagerduty/view), and [Opsgenie](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-opsgenie/view).

Setting up notifications from scratch takes about 30 minutes. Once the base configuration is in place, adding new services and triggers is a matter of editing the ConfigMap. Start simple with a webhook, verify it works, and then add your production services.

# ArgoCD Notification Templates Cheat Sheet

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Notifications, DevOps

Description: A quick reference cheat sheet for ArgoCD notification templates covering Slack, email, webhooks, and custom Go template syntax for deployment alerts.

---

ArgoCD notifications let you stay on top of what is happening in your clusters without watching dashboards all day. But the template syntax can be tricky to get right, especially when you are switching between Slack, email, and webhook formats. This cheat sheet gives you copy-paste ready templates and configuration snippets for the most common notification scenarios.

## Prerequisites

Before using any of these templates, make sure you have the ArgoCD Notifications controller installed. If you installed ArgoCD with Helm, you can enable it in your values file:

```yaml
# values.yaml for ArgoCD Helm chart
notifications:
  enabled: true
```

Or install it separately:

```bash
# Install ArgoCD Notifications
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/notifications_catalog/install.yaml
```

## ConfigMap Structure

All notification configuration lives in the `argocd-notifications-cm` ConfigMap. Here is the basic structure:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Service definitions go here
  service.slack: |
    token: $slack-token

  # Templates go here
  template.app-deployed: |
    message: |
      Application {{.app.metadata.name}} is now deployed.

  # Triggers go here
  trigger.on-deployed: |
    - description: Application is synced and healthy
      send:
        - app-deployed
      when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
```

## Slack Templates

### Basic Sync Success

```yaml
template.slack-sync-success: |
  slack:
    attachments: |
      [{
        "color": "#18be52",
        "title": "{{ .app.metadata.name }} synced successfully",
        "fields": [
          {"title": "Application", "value": "{{ .app.metadata.name }}", "short": true},
          {"title": "Sync Status", "value": "{{ .app.status.sync.status }}", "short": true},
          {"title": "Repository", "value": "{{ .app.spec.source.repoURL }}", "short": false},
          {"title": "Revision", "value": "{{ .app.status.sync.revision }}", "short": true}
        ]
      }]
```

### Sync Failed with Error Details

```yaml
template.slack-sync-failed: |
  slack:
    attachments: |
      [{
        "color": "#E96D76",
        "title": "{{ .app.metadata.name }} sync FAILED",
        "fields": [
          {"title": "Application", "value": "{{ .app.metadata.name }}", "short": true},
          {"title": "Project", "value": "{{ .app.spec.project }}", "short": true},
          {"title": "Error", "value": "{{ .app.status.operationState.message }}", "short": false},
          {"title": "Destination", "value": "{{ .app.spec.destination.server }}/{{ .app.spec.destination.namespace }}", "short": false}
        ]
      }]
```

### Health Degraded Alert

```yaml
template.slack-health-degraded: |
  slack:
    attachments: |
      [{
        "color": "#f4c030",
        "title": ":warning: {{ .app.metadata.name }} health degraded",
        "fields": [
          {"title": "Application", "value": "{{ .app.metadata.name }}", "short": true},
          {"title": "Health Status", "value": "{{ .app.status.health.status }}", "short": true},
          {"title": "Sync Status", "value": "{{ .app.status.sync.status }}", "short": true},
          {"title": "Cluster", "value": "{{ .app.spec.destination.server }}", "short": true}
        ]
      }]
```

### Detailed Deployment with Commit Info

```yaml
template.slack-deploy-details: |
  slack:
    attachments: |
      [{
        "color": "#18be52",
        "title": "Deployment: {{ .app.metadata.name }}",
        "title_link": "https://argocd.example.com/applications/{{ .app.metadata.name }}",
        "fields": [
          {"title": "Project", "value": "{{ .app.spec.project }}", "short": true},
          {"title": "Namespace", "value": "{{ .app.spec.destination.namespace }}", "short": true},
          {"title": "Revision", "value": "{{ .app.status.sync.revision | trunc 7 }}", "short": true},
          {"title": "Author", "value": "{{ (call .repo.GetCommitMetadata .app.status.sync.revision).Author }}", "short": true},
          {"title": "Message", "value": "{{ (call .repo.GetCommitMetadata .app.status.sync.revision).Message }}", "short": false}
        ]
      }]
```

## Email Templates

### Sync Status Email

```yaml
template.email-sync-status: |
  email:
    subject: "ArgoCD: {{ .app.metadata.name }} - {{ .app.status.sync.status }}"
  message: |
    ## Application Sync Report

    **Application:** {{ .app.metadata.name }}
    **Project:** {{ .app.spec.project }}
    **Sync Status:** {{ .app.status.sync.status }}
    **Health Status:** {{ .app.status.health.status }}
    **Repository:** {{ .app.spec.source.repoURL }}
    **Revision:** {{ .app.status.sync.revision }}
    **Destination:** {{ .app.spec.destination.server }} / {{ .app.spec.destination.namespace }}

    {{ if .app.status.operationState.message }}
    **Details:** {{ .app.status.operationState.message }}
    {{ end }}
```

### Daily Digest Email (useful for summaries)

```yaml
template.email-app-summary: |
  email:
    subject: "ArgoCD Status: {{ .app.metadata.name }} [{{ .app.status.health.status }}]"
  message: |
    Application {{ .app.metadata.name }} is currently {{ .app.status.health.status }}.

    - Sync: {{ .app.status.sync.status }}
    - Last synced revision: {{ .app.status.sync.revision | trunc 12 }}
    - Target: {{ .app.spec.destination.namespace }} on {{ .app.spec.destination.server }}
```

## Webhook Templates

### Generic JSON Webhook

```yaml
template.webhook-generic: |
  webhook:
    app-status:
      method: POST
      body: |
        {
          "application": "{{ .app.metadata.name }}",
          "project": "{{ .app.spec.project }}",
          "sync_status": "{{ .app.status.sync.status }}",
          "health_status": "{{ .app.status.health.status }}",
          "revision": "{{ .app.status.sync.revision }}",
          "namespace": "{{ .app.spec.destination.namespace }}",
          "cluster": "{{ .app.spec.destination.server }}",
          "timestamp": "{{ .app.status.operationState.finishedAt }}"
        }
```

### PagerDuty Integration

```yaml
template.pagerduty-trigger: |
  webhook:
    pagerduty:
      method: POST
      body: |
        {
          "routing_key": "your-pagerduty-routing-key",
          "event_action": "trigger",
          "payload": {
            "summary": "ArgoCD: {{ .app.metadata.name }} is {{ .app.status.health.status }}",
            "severity": "critical",
            "source": "argocd",
            "component": "{{ .app.metadata.name }}",
            "custom_details": {
              "sync_status": "{{ .app.status.sync.status }}",
              "health_status": "{{ .app.status.health.status }}",
              "namespace": "{{ .app.spec.destination.namespace }}"
            }
          }
        }
```

## Common Triggers

Here are the triggers that pair with the templates above:

```yaml
# Trigger on successful sync
trigger.on-sync-succeeded: |
  - when: app.status.operationState.phase in ['Succeeded']
    send: [slack-sync-success, email-sync-status]

# Trigger on sync failure
trigger.on-sync-failed: |
  - when: app.status.operationState.phase in ['Error', 'Failed']
    send: [slack-sync-failed, email-sync-status, pagerduty-trigger]

# Trigger on health degraded
trigger.on-health-degraded: |
  - when: app.status.health.status == 'Degraded'
    send: [slack-health-degraded, pagerduty-trigger]

# Trigger on out-of-sync detection
trigger.on-sync-status-unknown: |
  - when: app.status.sync.status == 'OutOfSync'
    send: [slack-sync-failed]

# Trigger on app deletion
trigger.on-deleted: |
  - when: app.metadata.deletionTimestamp != nil
    send: [slack-sync-failed]
```

## Go Template Functions Reference

ArgoCD notifications use Go templates. Here are the most useful functions:

```yaml
# Truncate strings (useful for commit hashes)
{{ .app.status.sync.revision | trunc 7 }}

# Get commit metadata
{{ (call .repo.GetCommitMetadata .app.status.sync.revision).Author }}
{{ (call .repo.GetCommitMetadata .app.status.sync.revision).Message }}
{{ (call .repo.GetCommitMetadata .app.status.sync.revision).Date }}

# Conditionals
{{ if eq .app.status.health.status "Healthy" }}All good{{ else }}Check app{{ end }}

# Range over resource results
{{ range .app.status.operationState.syncResult.resources }}
  - {{ .kind }}/{{ .name }}: {{ .status }}
{{ end }}

# Time formatting
{{ .app.status.operationState.finishedAt | toDate "2006-01-02T15:04:05Z07:00" | formatTime "Jan 02, 2006 15:04" }}
```

## Annotation-Based Subscriptions

Instead of configuring subscriptions in the ConfigMap, you can annotate individual applications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  annotations:
    # Subscribe to specific triggers and services
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: my-channel
    notifications.argoproj.io/subscribe.on-sync-failed.slack: alerts-channel
    notifications.argoproj.io/subscribe.on-health-degraded.pagerduty: ""
    notifications.argoproj.io/subscribe.on-sync-failed.email: team@example.com
```

## Service Configuration Quick Reference

```yaml
# Slack
service.slack: |
  token: $slack-token
  signingSecret: $slack-signing-secret

# Email (SMTP)
service.email: |
  host: smtp.gmail.com
  port: 465
  from: argocd@example.com
  username: $email-username
  password: $email-password

# Webhook
service.webhook.app-status: |
  url: https://your-api.example.com/webhooks/argocd
  headers:
    - name: Authorization
      value: Bearer $webhook-token
    - name: Content-Type
      value: application/json

# Microsoft Teams
service.teams: |
  recipientUrls:
    my-channel: $teams-webhook-url
```

## Debugging Tips

When templates are not working as expected, check these common issues:

```bash
# Check notification controller logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-notifications-controller

# Verify the ConfigMap is correct
kubectl get configmap argocd-notifications-cm -n argocd -o yaml

# Check secret references
kubectl get secret argocd-notifications-secret -n argocd -o yaml

# Test a template locally using argocd-notifications tools
argocd admin notifications template notify app-deployed my-app
```

Keep this cheat sheet handy as you build out your notification pipeline. For a deeper dive into building custom templates, see our post on [ArgoCD notification templates with custom Lua scripts](https://oneuptime.com/blog/post/2026-02-09-argocd-notification-lua-scripts/view).

# Understanding ArgoCD argocd-notifications-cm Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Notifications, Configuration

Description: A comprehensive guide to every configuration option in the ArgoCD argocd-notifications-cm ConfigMap, covering services, templates, triggers, and integration patterns.

---

The `argocd-notifications-cm` ConfigMap is the configuration hub for ArgoCD's notification system. It defines notification services (where to send), templates (what to send), and triggers (when to send). Understanding this ConfigMap thoroughly is the difference between a notification system that actually helps your team and one that either spams everyone or misses critical events.

## ConfigMap Structure

The notifications ConfigMap has three categories of keys:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Service definitions: service.<type>.<name>
  service.slack: |
    token: $slack-token

  # Template definitions: template.<name>
  template.app-sync-succeeded: |
    message: "App {{.app.metadata.name}} synced"

  # Trigger definitions: trigger.<name>
  trigger.on-sync-succeeded: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [app-sync-succeeded]

  # Context (global variables)
  context: |
    argocdUrl: https://argocd.example.com
```

## Service Definitions

Services define where notifications are sent. Each service type has its own configuration format.

### Slack Service

```yaml
data:
  # Default Slack service (unnamed)
  service.slack: |
    token: $slack-token
    icon: ":rocket:"
    username: ArgoCD
    signingSecret: $slack-signing-secret

  # Named Slack service (for multiple workspaces)
  service.slack.workspace-b: |
    token: $slack-token-workspace-b
```

The `$slack-token` syntax references a key in the `argocd-notifications-secret`.

### Email Service

```yaml
data:
  service.email: |
    host: smtp.gmail.com
    port: 465
    from: argocd@example.com
    username: $email-username
    password: $email-password
    html: true
```

### Webhook Service

```yaml
data:
  service.webhook.custom-hook: |
    url: https://hooks.example.com/argocd
    headers:
      - name: Authorization
        value: "Bearer $webhook-token"
      - name: Content-Type
        value: application/json
    insecureSkipVerify: false
```

### Microsoft Teams Service

```yaml
data:
  service.teams: |
    recipientUrls:
      my-channel: $teams-webhook-url
```

### Opsgenie Service

```yaml
data:
  service.opsgenie: |
    apiUrl: https://api.opsgenie.com
    apiKeys:
      default: $opsgenie-api-key
```

### PagerDuty Service

```yaml
data:
  service.pagerduty: |
    serviceKeys:
      my-service: $pagerduty-service-key
```

### Telegram Service

```yaml
data:
  service.telegram: |
    token: $telegram-token
```

### Grafana Service

```yaml
data:
  service.grafana: |
    apiUrl: https://grafana.example.com/api
    apiKey: $grafana-api-key
```

### GitHub Service

```yaml
data:
  service.github: |
    appID: 12345
    installationID: 67890
    privateKey: $github-app-private-key
```

Used for setting commit statuses and creating deployment notifications in GitHub.

## Template Definitions

Templates define the content and format of notifications. They use Go templating with access to application data.

### Basic Template

```yaml
data:
  template.app-sync-status: |
    message: |
      Application {{.app.metadata.name}} sync status: {{.app.status.sync.status}}
      Health: {{.app.status.health.status}}
```

### Slack Template with Attachments

```yaml
data:
  template.app-sync-succeeded: |
    message: "Application {{.app.metadata.name}} has been synced successfully."
    slack:
      attachments: |
        [{
          "color": "#18be52",
          "title": "{{.app.metadata.name}}",
          "title_link": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}",
          "fields": [
            {"title": "Sync Status", "value": "{{.app.status.sync.status}}", "short": true},
            {"title": "Health Status", "value": "{{.app.status.health.status}}", "short": true},
            {"title": "Repository", "value": "{{.app.spec.source.repoURL}}", "short": true},
            {"title": "Revision", "value": "{{.app.status.sync.revision | trunc 8}}", "short": true}
          ]
        }]
      blocks: |
        [{
          "type": "header",
          "text": {"type": "plain_text", "text": "Sync Succeeded"}
        }]
      deliveryPolicy: Post
      groupingKey: "{{.app.metadata.name}}"
```

### Slack Template with Blocks

```yaml
data:
  template.app-deployed: |
    slack:
      blocks: |
        [{
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "*{{.app.metadata.name}}* deployed successfully"
          }
        },
        {
          "type": "section",
          "fields": [
            {"type": "mrkdwn", "text": "*Project:*\n{{.app.spec.project}}"},
            {"type": "mrkdwn", "text": "*Revision:*\n{{.app.status.sync.revision | trunc 8}}"},
            {"type": "mrkdwn", "text": "*Environment:*\n{{index .app.metadata.labels \"environment\"}}"}
          ]
        },
        {
          "type": "actions",
          "elements": [
            {
              "type": "button",
              "text": {"type": "plain_text", "text": "View in ArgoCD"},
              "url": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"
            }
          ]
        }]
```

### Email Template

```yaml
data:
  template.app-health-degraded: |
    email:
      subject: "ArgoCD Alert: {{.app.metadata.name}} health degraded"
      body: |
        <h2>Application Health Degraded</h2>
        <p>Application <strong>{{.app.metadata.name}}</strong> in project
        <strong>{{.app.spec.project}}</strong> has degraded.</p>
        <table border="1" cellpadding="5">
          <tr><td>Health Status</td><td>{{.app.status.health.status}}</td></tr>
          <tr><td>Sync Status</td><td>{{.app.status.sync.status}}</td></tr>
          <tr><td>Repository</td><td>{{.app.spec.source.repoURL}}</td></tr>
        </table>
        <p><a href="{{.context.argocdUrl}}/applications/{{.app.metadata.name}}">View in ArgoCD</a></p>
```

### Webhook Template

```yaml
data:
  template.app-webhook: |
    webhook:
      custom-hook:
        method: POST
        body: |
          {
            "event": "sync-completed",
            "application": "{{.app.metadata.name}}",
            "project": "{{.app.spec.project}}",
            "syncStatus": "{{.app.status.sync.status}}",
            "healthStatus": "{{.app.status.health.status}}",
            "revision": "{{.app.status.sync.revision}}",
            "url": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"
          }
```

### GitHub Commit Status Template

```yaml
data:
  template.app-github-status: |
    github:
      repoURLPath: "{{.app.spec.source.repoURL}}"
      revisionPath: "{{.app.status.sync.revision}}"
      status:
        state: "{{if eq .app.status.operationState.phase \"Succeeded\"}}success{{else}}failure{{end}}"
        label: "argocd/{{.app.metadata.name}}"
        targetURL: "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"
```

## Trigger Definitions

Triggers define when to send notifications based on application state changes.

### Basic Triggers

```yaml
data:
  # Sync succeeded
  trigger.on-sync-succeeded: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [app-sync-succeeded]

  # Sync failed
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [app-sync-failed]

  # Health degraded
  trigger.on-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      send: [app-health-degraded]

  # Sync status changed
  trigger.on-sync-status-unknown: |
    - when: app.status.sync.status == 'Unknown'
      send: [app-sync-status-unknown]
```

### Triggers with oncePer

Prevent duplicate notifications:

```yaml
data:
  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
      oncePer: app.status.sync.revision
      send: [app-deployed]
```

The `oncePer` field ensures the notification fires only once per unique value of the specified field. In this example, only one notification per Git revision.

### Composite Triggers

Combine multiple conditions:

```yaml
data:
  trigger.on-production-deploy: |
    - when: >
        app.status.operationState.phase in ['Succeeded'] and
        app.status.health.status == 'Healthy' and
        app.metadata.labels.environment == 'production'
      oncePer: app.status.sync.revision
      send: [production-deploy-notification]
```

### Default Triggers

ArgoCD provides several built-in trigger conditions:

```yaml
data:
  # All built-in triggers combined
  defaultTriggers: |
    - on-sync-succeeded
    - on-sync-failed
    - on-health-degraded
```

## Context Configuration

The context key provides global variables available to all templates:

```yaml
data:
  context: |
    argocdUrl: https://argocd.example.com
    environmentName: production
    clusterName: us-east-1
```

These are accessed in templates as `{{.context.argocdUrl}}`, `{{.context.environmentName}}`, etc.

## Template Functions

Templates have access to several built-in functions:

- `trunc N` - truncate string to N characters
- `toUpper` - convert to uppercase
- `toLower` - convert to lowercase
- `replace "old" "new"` - string replacement
- `now` - current time
- `index .app.metadata.labels "key"` - access map values

## Subscribing Applications

Applications subscribe to triggers through annotations:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  annotations:
    # Subscribe to Slack notifications
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: "#deploys"
    notifications.argoproj.io/subscribe.on-sync-failed.slack: "#alerts"
    notifications.argoproj.io/subscribe.on-health-degraded.slack: "#alerts"

    # Subscribe to email
    notifications.argoproj.io/subscribe.on-sync-failed.email: "team@example.com"

    # Subscribe to webhook
    notifications.argoproj.io/subscribe.on-deployed.webhook.custom-hook: ""

    # Subscribe to default triggers
    notifications.argoproj.io/subscribe.slack: "#all-deploys"
```

## Summary

The `argocd-notifications-cm` ConfigMap is a powerful but complex configuration surface. The three pillars - services, templates, and triggers - work together to create a flexible notification pipeline. Start with the basic triggers (sync succeeded, sync failed, health degraded), then expand to custom templates and multiple channels as your needs grow. For a complete monitoring solution beyond notifications, integrate with [OneUptime](https://oneuptime.com) for alerting, incident management, and status page updates.

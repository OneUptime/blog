# How to Build Custom ArgoCD Notification Templates

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, Kubernetes, GitOps, Notifications, DevOps

Description: A comprehensive guide to building custom ArgoCD notification templates for Slack, email, and webhooks. Learn how to configure triggers, create dynamic templates with Go templating, and implement production-ready notification workflows.

---

> Effective notifications are the bridge between automated deployments and human awareness. When your GitOps pipeline deploys changes, your team needs to know what happened, when it happened, and whether it succeeded or failed.

ArgoCD provides a powerful notification system that integrates with popular messaging platforms. While default templates work for basic use cases, custom templates unlock the full potential of ArgoCD notifications, enabling rich, contextual alerts tailored to your team's workflow.

---

## Understanding ArgoCD Notifications Architecture

ArgoCD Notifications is a continuous monitoring component that watches ArgoCD Application resources for state changes. When specific conditions are met, it sends notifications through configured services.

```mermaid
flowchart TD
    subgraph ArgoCD["ArgoCD Controller"]
        App["Application CRD"]
        Sync["Sync Operation"]
        Health["Health Status"]
    end

    subgraph Notifications["Notification Controller"]
        Monitor["Application Monitor"]
        Triggers["Trigger Evaluation"]
        Templates["Template Rendering"]
        Services["Notification Services"]
    end

    subgraph Destinations["Notification Destinations"]
        Slack["Slack"]
        Email["Email"]
        Webhook["Webhook"]
        Teams["Microsoft Teams"]
        Opsgenie["OpsGenie"]
    end

    App --> Monitor
    Sync --> Monitor
    Health --> Monitor

    Monitor --> Triggers
    Triggers --> |"Condition Met"| Templates
    Templates --> Services

    Services --> Slack
    Services --> Email
    Services --> Webhook
    Services --> Teams
    Services --> Opsgenie
```

The notification flow works as follows:

1. **Application Monitor** continuously watches ArgoCD Application resources
2. **Trigger Evaluation** checks if any configured triggers match the current state
3. **Template Rendering** uses Go templates to generate notification content
4. **Notification Services** deliver messages to configured destinations

---

## Setting Up ArgoCD Notifications

### Installation

ArgoCD Notifications comes bundled with ArgoCD starting from version 2.4. For earlier versions, install it separately.

The following command installs the notifications controller in your cluster.

```bash
# For ArgoCD 2.4+, notifications are included by default
# Verify the notifications controller is running
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-notifications-controller

# For older versions, install separately
kubectl apply -n argocd -f \
    https://raw.githubusercontent.com/argoproj-labs/argocd-notifications/release-1.2/manifests/install.yaml
```

### Configuration Overview

Notifications are configured through two ConfigMaps and a Secret:

```mermaid
flowchart LR
    subgraph ConfigMaps["Configuration"]
        CM["argocd-notifications-cm"]
        Secret["argocd-notifications-secret"]
    end

    subgraph Content["ConfigMap Content"]
        Services["service.* - Service Configs"]
        Templates["template.* - Message Templates"]
        Triggers["trigger.* - Trigger Definitions"]
    end

    subgraph Secrets["Secret Content"]
        Tokens["API Tokens"]
        Passwords["Passwords"]
        Webhooks["Webhook URLs"]
    end

    CM --> Services
    CM --> Templates
    CM --> Triggers
    Secret --> Tokens
    Secret --> Passwords
    Secret --> Webhooks
```

---

## Configuring Notification Services

### Slack Configuration

Slack is the most popular notification destination. Configure it using either a bot token or incoming webhook.

Store your Slack token securely in a Kubernetes secret.

```yaml
# argocd-notifications-secret.yaml
# Store sensitive credentials in the secret
apiVersion: v1
kind: Secret
metadata:
  name: argocd-notifications-secret
  namespace: argocd
type: Opaque
stringData:
  # Slack bot token (preferred method)
  slack-token: xoxb-your-slack-bot-token

  # Alternative: Slack incoming webhook URL
  slack-webhook-url: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

Configure the Slack service in the notifications ConfigMap.

```yaml
# argocd-notifications-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Slack service using bot token
  service.slack: |
    token: $slack-token
    username: ArgoCD
    icon: https://argoproj.github.io/argo-cd/assets/logo.png

  # Alternative: Slack service using webhook
  service.slack-webhook: |
    url: $slack-webhook-url
```

### Email Configuration

Configure SMTP settings for email notifications.

```yaml
# Email service configuration in argocd-notifications-cm.yaml
data:
  service.email: |
    host: smtp.gmail.com
    port: 587
    username: $email-username
    password: $email-password
    from: argocd-notifications@yourdomain.com
```

### Webhook Configuration

Webhooks enable integration with any HTTP endpoint.

```yaml
# Webhook service for custom integrations
data:
  service.webhook.deployment-tracker: |
    url: https://api.yourdomain.com/deployment-events
    headers:
      - name: Authorization
        value: Bearer $webhook-token
      - name: Content-Type
        value: application/json
```

### Microsoft Teams Configuration

Configure Microsoft Teams using an incoming webhook.

```yaml
# Microsoft Teams webhook configuration
data:
  service.teams: |
    recipientUrls:
      devops-channel: $teams-webhook-url
```

---

## Building Custom Templates

Templates use Go's text/template syntax to generate notification content. ArgoCD provides extensive context about the application state.

### Available Template Variables

Understanding the available variables is essential for building effective templates.

```mermaid
flowchart TD
    subgraph Context["Template Context"]
        App["app - Application Object"]
        Context2["context - ArgoCD Context"]
        Notif["notificationName"]
    end

    subgraph AppFields["Application Fields"]
        Metadata["app.metadata.name"]
        Spec["app.spec.source"]
        Status["app.status.sync"]
        Health["app.status.health"]
        Operation["app.status.operationState"]
    end

    subgraph ContextFields["Context Fields"]
        ArgoURL["context.argocdUrl"]
    end

    App --> Metadata
    App --> Spec
    App --> Status
    App --> Health
    App --> Operation
    Context2 --> ArgoURL
```

### Basic Slack Template

Create a simple deployment notification template.

```yaml
# Basic deployment notification template
data:
  template.app-deployed: |
    message: |
      Application {{.app.metadata.name}} has been deployed!
      Sync Status: {{.app.status.sync.status}}
      Health Status: {{.app.status.health.status}}
      Revision: {{.app.status.sync.revision}}
    slack:
      attachments: |
        [{
          "color": "#18be52",
          "title": "{{.app.metadata.name}} Deployed",
          "title_link": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}",
          "fields": [
            {
              "title": "Sync Status",
              "value": "{{.app.status.sync.status}}",
              "short": true
            },
            {
              "title": "Health Status",
              "value": "{{.app.status.health.status}}",
              "short": true
            }
          ]
        }]
```

### Rich Slack Template with Blocks

Modern Slack Block Kit provides more formatting options.

```yaml
# Rich Slack notification using Block Kit
data:
  template.app-sync-status-rich: |
    message: "Application {{.app.metadata.name}} sync status: {{.app.status.sync.status}}"
    slack:
      blocks: |
        [
          {
            "type": "header",
            "text": {
              "type": "plain_text",
              "text": "ArgoCD Deployment Update"
            }
          },
          {
            "type": "section",
            "fields": [
              {
                "type": "mrkdwn",
                "text": "*Application:*\n{{.app.metadata.name}}"
              },
              {
                "type": "mrkdwn",
                "text": "*Environment:*\n{{index .app.metadata.labels \"env\" | default \"unknown\"}}"
              },
              {
                "type": "mrkdwn",
                "text": "*Sync Status:*\n{{.app.status.sync.status}}"
              },
              {
                "type": "mrkdwn",
                "text": "*Health:*\n{{.app.status.health.status}}"
              }
            ]
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Revision:* `{{.app.status.sync.revision | trunc 7}}`"
            }
          },
          {
            "type": "actions",
            "elements": [
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "View in ArgoCD"
                },
                "url": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"
              },
              {
                "type": "button",
                "text": {
                  "type": "plain_text",
                  "text": "View Diff"
                },
                "url": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}?operation=true"
              }
            ]
          }
        ]
```

### Conditional Formatting Template

Use Go template conditionals for context-aware notifications.

```yaml
# Template with conditional logic based on sync and health status
data:
  template.app-status-conditional: |
    message: "{{.app.metadata.name}}: {{.app.status.sync.status}}"
    slack:
      attachments: |
        [{
          {{/* Set color based on health status */}}
          {{if eq .app.status.health.status "Healthy"}}
          "color": "#18be52",
          {{else if eq .app.status.health.status "Degraded"}}
          "color": "#E96D76",
          {{else if eq .app.status.health.status "Progressing"}}
          "color": "#0DADEA",
          {{else}}
          "color": "#f4c030",
          {{end}}

          "title": "{{.app.metadata.name}}",
          "title_link": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}",
          "text": "{{if eq .app.status.sync.status "Synced"}}Deployment completed successfully{{else if eq .app.status.sync.status "OutOfSync"}}Application is out of sync with Git{{else}}Sync operation in progress{{end}}",

          "fields": [
            {
              "title": "Sync Status",
              "value": "{{.app.status.sync.status}}",
              "short": true
            },
            {
              "title": "Health",
              "value": "{{.app.status.health.status}}",
              "short": true
            },
            {
              "title": "Namespace",
              "value": "{{.app.spec.destination.namespace}}",
              "short": true
            },
            {
              "title": "Cluster",
              "value": "{{.app.spec.destination.server}}",
              "short": true
            }
            {{if .app.status.operationState}}
            ,{
              "title": "Operation",
              "value": "{{.app.status.operationState.operation.sync.revision | trunc 7}}",
              "short": true
            },
            {
              "title": "Started",
              "value": "{{.app.status.operationState.startedAt}}",
              "short": true
            }
            {{end}}
          ],

          "footer": "ArgoCD Notifications",
          "footer_icon": "https://argoproj.github.io/argo-cd/assets/logo.png"
        }]
```

### Email Template

Create rich HTML email notifications.

```yaml
# HTML email template for deployment notifications
data:
  template.app-deployed-email: |
    email:
      subject: "ArgoCD: {{.app.metadata.name}} - {{.app.status.sync.status}}"
      body: |
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2d3748; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f7fafc; padding: 20px; border-radius: 0 0 8px 8px; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: bold; }
            .status-synced { background: #c6f6d5; color: #276749; }
            .status-outofsync { background: #fed7d7; color: #c53030; }
            .status-progressing { background: #bee3f8; color: #2b6cb0; }
            .field { margin-bottom: 10px; }
            .field-label { font-weight: bold; color: #4a5568; }
            .button { display: inline-block; background: #4299e1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Deployment Update</h1>
              <p style="margin: 5px 0 0 0;">{{.app.metadata.name}}</p>
            </div>
            <div class="content">
              <div class="field">
                <span class="field-label">Sync Status:</span>
                <span class="status {{if eq .app.status.sync.status "Synced"}}status-synced{{else if eq .app.status.sync.status "OutOfSync"}}status-outofsync{{else}}status-progressing{{end}}">
                  {{.app.status.sync.status}}
                </span>
              </div>
              <div class="field">
                <span class="field-label">Health Status:</span> {{.app.status.health.status}}
              </div>
              <div class="field">
                <span class="field-label">Revision:</span> <code>{{.app.status.sync.revision | trunc 12}}</code>
              </div>
              <div class="field">
                <span class="field-label">Namespace:</span> {{.app.spec.destination.namespace}}
              </div>
              <div class="field">
                <span class="field-label">Cluster:</span> {{.app.spec.destination.server}}
              </div>
              {{if .app.status.operationState}}
              <div class="field">
                <span class="field-label">Operation Started:</span> {{.app.status.operationState.startedAt}}
              </div>
              {{if .app.status.operationState.finishedAt}}
              <div class="field">
                <span class="field-label">Operation Finished:</span> {{.app.status.operationState.finishedAt}}
              </div>
              {{end}}
              {{end}}
              <a href="{{.context.argocdUrl}}/applications/{{.app.metadata.name}}" class="button">View in ArgoCD</a>
            </div>
          </div>
        </body>
        </html>
```

### Webhook Template

Create JSON payloads for webhook integrations.

```yaml
# Webhook template for custom integrations
data:
  template.deployment-webhook: |
    webhook:
      deployment-tracker:
        method: POST
        body: |
          {
            "event_type": "deployment",
            "timestamp": "{{.app.status.operationState.finishedAt}}",
            "application": {
              "name": "{{.app.metadata.name}}",
              "namespace": "{{.app.spec.destination.namespace}}",
              "cluster": "{{.app.spec.destination.server}}",
              "project": "{{.app.spec.project}}"
            },
            "source": {
              "repo_url": "{{.app.spec.source.repoURL}}",
              "path": "{{.app.spec.source.path}}",
              "target_revision": "{{.app.spec.source.targetRevision}}",
              "deployed_revision": "{{.app.status.sync.revision}}"
            },
            "status": {
              "sync": "{{.app.status.sync.status}}",
              "health": "{{.app.status.health.status}}",
              "operation_phase": "{{.app.status.operationState.phase}}"
            },
            "argocd_url": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}",
            "labels": {{.app.metadata.labels | toJson}}
          }
```

---

## Configuring Triggers

Triggers define when notifications should be sent based on application state changes.

### Understanding Trigger Syntax

```mermaid
flowchart TD
    subgraph Trigger["Trigger Definition"]
        Condition["when: condition expression"]
        Send["send: list of templates"]
    end

    subgraph Conditions["Common Conditions"]
        SyncSuccess["app.status.sync.status == 'Synced'"]
        SyncFailed["app.status.operationState.phase == 'Failed'"]
        HealthDegraded["app.status.health.status == 'Degraded'"]
        NewCommit["app.status.sync.revision != app.status.history[0].revision"]
    end

    Trigger --> Condition
    Trigger --> Send
    Condition --> Conditions
```

### Sync Success Trigger

Send notifications when an application syncs successfully.

```yaml
# Trigger for successful sync completion
data:
  trigger.on-sync-succeeded: |
    - description: Application synced successfully
      when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
      send:
        - app-deployed
        - app-deployed-email
```

### Sync Failed Trigger

Alert the team when a sync operation fails.

```yaml
# Trigger for failed sync operations
data:
  trigger.on-sync-failed: |
    - description: Application sync failed
      when: app.status.operationState.phase in ['Error', 'Failed']
      send:
        - app-sync-failed
```

### Health Degraded Trigger

Monitor application health status changes.

```yaml
# Trigger for health status degradation
data:
  trigger.on-health-degraded: |
    - description: Application health degraded
      when: app.status.health.status == 'Degraded'
      send:
        - app-health-degraded
```

### Multiple Conditions Trigger

Combine multiple conditions for specific scenarios.

```yaml
# Trigger with multiple conditions for production deployments
data:
  trigger.on-prod-deployment: |
    - description: Production deployment completed
      when: |
        app.status.operationState.phase == 'Succeeded' and
        app.status.health.status == 'Healthy' and
        (app.metadata.labels.env == 'production' or app.metadata.labels.environment == 'prod')
      send:
        - prod-deployment-notification
        - deployment-webhook
```

### Out of Sync Trigger

Notify when applications drift from their Git source.

```yaml
# Trigger for out-of-sync detection
data:
  trigger.on-out-of-sync: |
    - description: Application is out of sync with Git
      when: app.status.sync.status == 'OutOfSync'
      send:
        - app-out-of-sync
```

---

## Complete Configuration Example

Here is a complete ConfigMap with multiple templates and triggers.

```yaml
# Complete argocd-notifications-cm.yaml example
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Context configuration for ArgoCD URL
  context: |
    argocdUrl: https://argocd.yourdomain.com

  # Slack service configuration
  service.slack: |
    token: $slack-token
    username: ArgoCD Bot
    icon: https://argoproj.github.io/argo-cd/assets/logo.png

  # Email service configuration
  service.email: |
    host: smtp.yourdomain.com
    port: 587
    username: $email-username
    password: $email-password
    from: argocd@yourdomain.com

  # Webhook service for deployment tracking
  service.webhook.deployment-tracker: |
    url: https://api.yourdomain.com/deployments
    headers:
      - name: Authorization
        value: Bearer $webhook-token
      - name: Content-Type
        value: application/json

  # Template: Successful deployment
  template.app-deployed: |
    message: "Application {{.app.metadata.name}} deployed successfully"
    slack:
      attachments: |
        [{
          "color": "#18be52",
          "author_name": "ArgoCD",
          "author_icon": "https://argoproj.github.io/argo-cd/assets/logo.png",
          "title": "{{.app.metadata.name}} - Deployment Successful",
          "title_link": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}",
          "text": "Application has been synced and is healthy.",
          "fields": [
            {"title": "Revision", "value": "`{{.app.status.sync.revision | trunc 7}}`", "short": true},
            {"title": "Environment", "value": "{{index .app.metadata.labels \"env\" | default \"unknown\"}}", "short": true},
            {"title": "Namespace", "value": "{{.app.spec.destination.namespace}}", "short": true},
            {"title": "Health", "value": "{{.app.status.health.status}}", "short": true}
          ],
          "footer": "{{.app.spec.source.repoURL}}",
          "ts": "{{.app.status.operationState.finishedAt | toUnixSeconds}}"
        }]

  # Template: Failed sync
  template.app-sync-failed: |
    message: "ALERT: {{.app.metadata.name}} sync failed!"
    slack:
      attachments: |
        [{
          "color": "#E96D76",
          "author_name": "ArgoCD",
          "author_icon": "https://argoproj.github.io/argo-cd/assets/logo.png",
          "title": "{{.app.metadata.name}} - Sync Failed",
          "title_link": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}",
          "text": "{{if .app.status.operationState.message}}{{.app.status.operationState.message}}{{else}}Sync operation failed. Check ArgoCD for details.{{end}}",
          "fields": [
            {"title": "Phase", "value": "{{.app.status.operationState.phase}}", "short": true},
            {"title": "Environment", "value": "{{index .app.metadata.labels \"env\" | default \"unknown\"}}", "short": true},
            {"title": "Revision", "value": "`{{.app.status.operationState.operation.sync.revision | trunc 7}}`", "short": true},
            {"title": "Started", "value": "{{.app.status.operationState.startedAt}}", "short": true}
          ],
          "footer": "Immediate attention required"
        }]

  # Template: Health degraded
  template.app-health-degraded: |
    message: "WARNING: {{.app.metadata.name}} health degraded"
    slack:
      attachments: |
        [{
          "color": "#f4c030",
          "author_name": "ArgoCD",
          "title": "{{.app.metadata.name}} - Health Degraded",
          "title_link": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}",
          "text": "Application health status has changed to Degraded.",
          "fields": [
            {"title": "Health Status", "value": "{{.app.status.health.status}}", "short": true},
            {"title": "Sync Status", "value": "{{.app.status.sync.status}}", "short": true},
            {"title": "Namespace", "value": "{{.app.spec.destination.namespace}}", "short": true}
            {{range $index, $resource := .app.status.resources}}
            {{if eq $resource.health.status "Degraded"}}
            ,{"title": "Degraded Resource", "value": "{{$resource.kind}}/{{$resource.name}}", "short": false}
            {{end}}
            {{end}}
          ]
        }]

  # Template: Out of sync
  template.app-out-of-sync: |
    message: "{{.app.metadata.name}} is out of sync with Git"
    slack:
      attachments: |
        [{
          "color": "#0DADEA",
          "title": "{{.app.metadata.name}} - Out of Sync",
          "title_link": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}",
          "text": "Application has drifted from the desired state in Git.",
          "fields": [
            {"title": "Current Revision", "value": "`{{.app.status.sync.revision | trunc 7}}`", "short": true},
            {"title": "Target Revision", "value": "{{.app.spec.source.targetRevision}}", "short": true}
          ]
        }]

  # Trigger: Sync succeeded
  trigger.on-sync-succeeded: |
    - description: Application synced successfully
      when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
      send:
        - app-deployed

  # Trigger: Sync failed
  trigger.on-sync-failed: |
    - description: Application sync failed
      when: app.status.operationState.phase in ['Error', 'Failed']
      send:
        - app-sync-failed

  # Trigger: Health degraded
  trigger.on-health-degraded: |
    - description: Application health is degraded
      when: app.status.health.status == 'Degraded'
      send:
        - app-health-degraded

  # Trigger: Out of sync
  trigger.on-out-of-sync: |
    - description: Application drifted from Git
      when: app.status.sync.status == 'OutOfSync'
      send:
        - app-out-of-sync
```

---

## Subscribing Applications to Notifications

Applications must be annotated to receive notifications.

### Annotation Syntax

```yaml
# Application with notification subscriptions
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-application
  namespace: argocd
  annotations:
    # Subscribe to triggers and send to specific channels
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: deployments-channel
    notifications.argoproj.io/subscribe.on-sync-failed.slack: alerts-channel
    notifications.argoproj.io/subscribe.on-health-degraded.slack: alerts-channel

    # Subscribe to email notifications
    notifications.argoproj.io/subscribe.on-sync-succeeded.email: devops-team@yourdomain.com

    # Subscribe to webhooks
    notifications.argoproj.io/subscribe.on-sync-succeeded.deployment-tracker: ""
spec:
  project: default
  source:
    repoURL: https://github.com/yourorg/manifests.git
    targetRevision: main
    path: apps/my-application
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
```

### Using Default Subscriptions

Configure default subscriptions for all applications in a project.

```yaml
# argocd-notifications-cm.yaml - default triggers section
data:
  # Default triggers applied to all applications
  defaultTriggers: |
    - on-sync-succeeded
    - on-sync-failed
    - on-health-degraded

  # Subscription configuration by project
  subscriptions: |
    - recipients:
        - slack:deployments-channel
      triggers:
        - on-sync-succeeded
      selector:
        matchLabels:
          env: production
    - recipients:
        - slack:alerts-channel
        - email:oncall@yourdomain.com
      triggers:
        - on-sync-failed
        - on-health-degraded
```

---

## Advanced Template Techniques

### Using Template Functions

ArgoCD provides several built-in template functions.

```yaml
# Template demonstrating built-in functions
data:
  template.app-with-functions: |
    message: |
      Application: {{.app.metadata.name}}

      {{/* String manipulation */}}
      Short Revision: {{.app.status.sync.revision | trunc 7}}
      Uppercase Name: {{.app.metadata.name | upper}}

      {{/* Time formatting */}}
      Started: {{.app.status.operationState.startedAt | toUnixSeconds | formatTime "2006-01-02 15:04:05"}}

      {{/* Default values */}}
      Environment: {{index .app.metadata.labels "env" | default "not-specified"}}

      {{/* JSON encoding */}}
      Labels: {{.app.metadata.labels | toJson}}

      {{/* Conditional logic */}}
      Status: {{if eq .app.status.health.status "Healthy"}}All systems operational{{else}}Issues detected{{end}}
```

### Iterating Over Resources

Display information about individual resources in the application.

```yaml
# Template showing resource-level details
data:
  template.app-resources-detail: |
    message: "{{.app.metadata.name}} resource status"
    slack:
      blocks: |
        [
          {
            "type": "header",
            "text": {
              "type": "plain_text",
              "text": "{{.app.metadata.name}} Resources"
            }
          },
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Total Resources:* {{len .app.status.resources}}"
            }
          }
          {{range $index, $resource := .app.status.resources}}
          {{if lt $index 10}}
          ,{
            "type": "section",
            "fields": [
              {
                "type": "mrkdwn",
                "text": "*{{$resource.kind}}*\n{{$resource.name}}"
              },
              {
                "type": "mrkdwn",
                "text": "*Status*\n{{$resource.status}} / {{$resource.health.status}}"
              }
            ]
          }
          {{end}}
          {{end}}
        ]
```

### Including Commit Information

Show Git commit details in notifications.

```yaml
# Template with commit information
data:
  template.app-with-commit-info: |
    message: "Deployment: {{.app.metadata.name}}"
    slack:
      attachments: |
        [{
          "color": "#18be52",
          "title": "{{.app.metadata.name}} Deployed",
          "title_link": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}",
          "fields": [
            {
              "title": "Commit",
              "value": "<{{.app.spec.source.repoURL}}/commit/{{.app.status.sync.revision}}|{{.app.status.sync.revision | trunc 7}}>",
              "short": true
            },
            {
              "title": "Repository",
              "value": "{{.app.spec.source.repoURL | replace \"https://github.com/\" \"\" | replace \".git\" \"\"}}",
              "short": true
            },
            {
              "title": "Path",
              "value": "`{{.app.spec.source.path}}`",
              "short": true
            },
            {
              "title": "Branch",
              "value": "{{.app.spec.source.targetRevision}}",
              "short": true
            }
          ]
        }]
```

---

## Testing Notifications

### Using the ArgoCD CLI

Test your notification configuration using the ArgoCD notifications CLI.

```bash
# Install the argocd-notifications CLI plugin
# The plugin allows testing templates locally

# Test a specific template with a sample application
argocd-notifications template notify app-deployed my-application \
    --recipient slack:deployments-channel

# Preview template output without sending
argocd-notifications template get app-deployed --format json

# List all configured triggers
argocd-notifications trigger list

# Test trigger evaluation against an application
argocd-notifications trigger eval on-sync-succeeded my-application
```

### Manual Testing with kubectl

Verify your configuration is correctly applied.

```bash
# Check the ConfigMap is properly formatted
kubectl get configmap argocd-notifications-cm -n argocd -o yaml

# Check logs for notification errors
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-notifications-controller --tail=100

# Verify application annotations
kubectl get application my-application -n argocd -o jsonpath='{.metadata.annotations}'

# Trigger a manual sync to test notifications
argocd app sync my-application
```

---

## Troubleshooting Common Issues

### Notifications Not Sending

```mermaid
flowchart TD
    Start["Notifications Not Working"]

    Start --> Check1{"Check Controller\nLogs"}
    Check1 --> |"Errors Found"| Fix1["Fix Configuration"]
    Check1 --> |"No Errors"| Check2{"Check App\nAnnotations"}

    Check2 --> |"Missing"| Fix2["Add Annotations"]
    Check2 --> |"Present"| Check3{"Check Trigger\nConditions"}

    Check3 --> |"Not Matching"| Fix3["Adjust Trigger\nExpression"]
    Check3 --> |"Matching"| Check4{"Check Service\nConfig"}

    Check4 --> |"Invalid"| Fix4["Fix Service\nCredentials"]
    Check4 --> |"Valid"| Check5{"Check Secret\nReferences"}

    Check5 --> |"Missing"| Fix5["Create/Update\nSecret"]
    Check5 --> |"Present"| Success["Notifications\nShould Work"]
```

### Common Configuration Errors

Check for these frequent mistakes in your configuration.

```bash
# Verify secret exists and has correct keys
kubectl get secret argocd-notifications-secret -n argocd -o jsonpath='{.data}' | base64 -d

# Check for YAML syntax errors in ConfigMap
kubectl apply -f argocd-notifications-cm.yaml --dry-run=client

# Validate trigger expressions
# Expression should evaluate to boolean
# Common mistake: using 'and' instead of '&&' or using Go syntax 'and'

# Verify the service name matches in template and subscription
# Service: service.slack
# Annotation: notifications.argoproj.io/subscribe.trigger-name.slack
```

### Debug Logging

Enable debug logging for troubleshooting.

```yaml
# Patch the notifications controller for debug logging
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-notifications-controller
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-notifications-controller
          args:
            - /usr/local/bin/argocd-notifications-controller
            - --loglevel=debug
```

---

## Best Practices

### 1. Use Meaningful Channel Names

Organize Slack channels by environment and urgency.

```yaml
# Channel organization example
annotations:
  # Production alerts go to high-priority channel
  notifications.argoproj.io/subscribe.on-sync-failed.slack: prod-alerts
  notifications.argoproj.io/subscribe.on-health-degraded.slack: prod-alerts

  # Successful deployments go to general channel
  notifications.argoproj.io/subscribe.on-sync-succeeded.slack: prod-deployments

  # Development notifications to dev channel
  notifications.argoproj.io/subscribe.on-sync-succeeded.slack: dev-deployments
```

### 2. Implement Notification Throttling

Prevent notification fatigue with appropriate trigger conditions.

```yaml
# Trigger with debounce-like behavior using oncePer
data:
  trigger.on-sync-status-unknown: |
    - description: Sync status unknown
      when: app.status.sync.status == 'Unknown'
      oncePer: app.status.sync.revision
      send:
        - app-sync-unknown
```

### 3. Include Actionable Information

Make notifications actionable with direct links and context.

```yaml
# Template with actionable elements
data:
  template.app-actionable: |
    slack:
      blocks: |
        [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*{{.app.metadata.name}}* sync failed"
            }
          },
          {
            "type": "actions",
            "elements": [
              {
                "type": "button",
                "text": {"type": "plain_text", "text": "View Logs"},
                "url": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}?resource=&node=argoproj.io%2FApplication%2F{{.app.metadata.namespace}}%2F{{.app.metadata.name}}&tab=logs"
              },
              {
                "type": "button",
                "text": {"type": "plain_text", "text": "Retry Sync"},
                "url": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}?operation=true"
              },
              {
                "type": "button",
                "text": {"type": "plain_text", "text": "View Diff"},
                "url": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}?view=tree&resource="
              }
            ]
          }
        ]
```

### 4. Separate Production and Non-Production

Use different notification configurations for different environments.

```yaml
# Production-specific trigger with higher urgency
data:
  trigger.on-prod-failure: |
    - description: Production sync failed
      when: |
        app.status.operationState.phase in ['Error', 'Failed'] and
        app.metadata.labels.env == 'production'
      send:
        - prod-critical-failure
        - page-oncall
```

---

## Conclusion

Custom ArgoCD notification templates transform your GitOps workflow by providing timely, contextual alerts that help teams respond quickly to deployment events. Key takeaways from this guide:

- **Understand the architecture**: Triggers evaluate conditions, templates generate content, and services deliver notifications
- **Use rich formatting**: Slack Block Kit and HTML emails provide better readability than plain text
- **Implement conditional logic**: Go templates enable context-aware notifications based on application state
- **Subscribe strategically**: Route different events to appropriate channels and recipients
- **Test thoroughly**: Use the ArgoCD notifications CLI and kubectl to validate configurations
- **Follow best practices**: Organize channels by urgency, include actionable links, and prevent notification fatigue

Well-designed notifications are a critical component of a mature GitOps practice, enabling teams to stay informed without being overwhelmed.

---

*Need comprehensive monitoring for your Kubernetes deployments? [OneUptime](https://oneuptime.com) integrates with ArgoCD and provides end-to-end visibility into your GitOps pipelines, application health, and infrastructure performance.*

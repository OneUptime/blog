# How to Configure Notifications in ArgoCD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ArgoCD, Notifications, Slack, Teams, PagerDuty, Alerting, GitOps

Description: Set up ArgoCD notifications to alert your team about deployment events via Slack, Microsoft Teams, email, webhooks, and PagerDuty, with customizable templates and triggers.

---

Deployments should not be silent. Your team needs to know when apps sync, fail, or drift. ArgoCD Notifications sends alerts to Slack, Teams, email, and more. This guide covers setup, customization, and real-world notification patterns.

## ArgoCD Notifications Architecture

Notifications work through triggers, templates, and services:

```mermaid
flowchart LR
    App[Application Event] --> Trigger[Trigger Evaluates]
    Trigger --> |"Condition Met"| Template[Template Renders]
    Template --> Service[Service Sends]
    Service --> Slack[Slack]
    Service --> Teams[Teams]
    Service --> Email[Email]
    Service --> Webhook[Webhook]
```

## Installation

ArgoCD Notifications is included in ArgoCD since v2.3. For older versions:

```bash
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj-labs/argocd-notifications/stable/manifests/install.yaml
```

Verify it is running:

```bash
kubectl get pods -n argocd | grep notifications
```

## Configuring Slack Notifications

### Step 1: Create a Slack App

1. Go to https://api.slack.com/apps
2. Create New App > From scratch
3. Add OAuth Scopes: `chat:write`
4. Install to workspace
5. Copy the Bot User OAuth Token

### Step 2: Configure ArgoCD

```yaml
# argocd-notifications-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: argocd-notifications-secret
  namespace: argocd
type: Opaque
stringData:
  slack-token: xoxb-your-bot-token
```

```yaml
# argocd-notifications-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Service configuration
  service.slack: |
    token: $slack-token

  # Templates
  template.app-deployed: |
    message: |
      Application {{.app.metadata.name}} is now running new version of deployments manifests.
    slack:
      attachments: |
        [{
          "color": "#18be52",
          "fields": [
            {
              "title": "Application",
              "value": "{{.app.metadata.name}}",
              "short": true
            },
            {
              "title": "Sync Status",
              "value": "{{.app.status.sync.status}}",
              "short": true
            },
            {
              "title": "Repository",
              "value": "{{.app.spec.source.repoURL}}",
              "short": true
            },
            {
              "title": "Revision",
              "value": "{{.app.status.sync.revision}}",
              "short": true
            }
          ]
        }]

  template.app-sync-failed: |
    message: |
      Application {{.app.metadata.name}} sync failed!
    slack:
      attachments: |
        [{
          "color": "#E96D76",
          "fields": [
            {
              "title": "Application",
              "value": "{{.app.metadata.name}}",
              "short": true
            },
            {
              "title": "Error",
              "value": "{{.app.status.operationState.message}}",
              "short": false
            }
          ]
        }]

  # Triggers
  trigger.on-deployed: |
    - description: Application is synced and healthy
      send:
        - app-deployed
      when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'

  trigger.on-sync-failed: |
    - description: Application sync failed
      send:
        - app-sync-failed
      when: app.status.operationState.phase in ['Error', 'Failed']
```

Apply the configuration:

```bash
kubectl apply -f argocd-notifications-secret.yaml
kubectl apply -f argocd-notifications-cm.yaml
```

### Step 3: Subscribe Applications

Add annotations to subscribe applications to notifications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
  annotations:
    # Subscribe to triggers, send to channel
    notifications.argoproj.io/subscribe.on-deployed.slack: deployments
    notifications.argoproj.io/subscribe.on-sync-failed.slack: alerts
```

Or subscribe all applications in a project:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
  annotations:
    notifications.argoproj.io/subscribe.on-deployed.slack: prod-deployments
    notifications.argoproj.io/subscribe.on-sync-failed.slack: prod-alerts
```

## Configuring Microsoft Teams

```yaml
data:
  service.teams: |
    recipientUrls:
      deployments: https://outlook.office.com/webhook/xxx
      alerts: https://outlook.office.com/webhook/yyy

  template.app-deployed-teams: |
    teams:
      themeColor: "#18be52"
      title: "Deployment Successful"
      sections: |
        [{
          "facts": [
            { "name": "Application", "value": "{{.app.metadata.name}}" },
            { "name": "Status", "value": "{{.app.status.sync.status}}" },
            { "name": "Revision", "value": "{{.app.status.sync.revision}}" }
          ]
        }]
      potentialAction: |
        [{
          "@type": "OpenUri",
          "name": "View in ArgoCD",
          "targets": [{
            "os": "default",
            "uri": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"
          }]
        }]
```

Subscribe using Teams:

```yaml
annotations:
  notifications.argoproj.io/subscribe.on-deployed.teams: deployments
```

## Configuring Email Notifications

```yaml
data:
  service.email: |
    host: smtp.example.com
    port: 587
    username: $email-username
    password: $email-password
    from: argocd@example.com

  template.app-deployed-email: |
    email:
      subject: "ArgoCD: {{.app.metadata.name}} deployed"
    message: |
      Application: {{.app.metadata.name}}
      Status: {{.app.status.sync.status}}
      Health: {{.app.status.health.status}}
      Revision: {{.app.status.sync.revision}}

      View: {{.context.argocdUrl}}/applications/{{.app.metadata.name}}
```

Subscribe with email:

```yaml
annotations:
  notifications.argoproj.io/subscribe.on-deployed.email: team@example.com
```

## Configuring Webhooks

Send notifications to any HTTP endpoint:

```yaml
data:
  service.webhook.deployment-tracker: |
    url: https://api.example.com/deployments
    headers:
      - name: Authorization
        value: Bearer $webhook-token
      - name: Content-Type
        value: application/json

  template.webhook-payload: |
    webhook:
      deployment-tracker:
        method: POST
        body: |
          {
            "application": "{{.app.metadata.name}}",
            "namespace": "{{.app.spec.destination.namespace}}",
            "revision": "{{.app.status.sync.revision}}",
            "status": "{{.app.status.sync.status}}",
            "health": "{{.app.status.health.status}}",
            "timestamp": "{{.app.status.operationState.finishedAt}}"
          }
```

## Configuring PagerDuty

```yaml
data:
  service.pagerduty: |
    serviceKeys:
      production: $pagerduty-key

  template.app-degraded-pagerduty: |
    pagerduty:
      routingKey: production
      eventAction: trigger
      payload:
        summary: "{{.app.metadata.name}} is degraded"
        severity: critical
        source: argocd
        customDetails:
          application: "{{.app.metadata.name}}"
          health: "{{.app.status.health.status}}"
          message: "{{.app.status.health.message}}"

  trigger.on-health-degraded: |
    - description: Application health degraded
      send:
        - app-degraded-pagerduty
      when: app.status.health.status == 'Degraded'
```

## Custom Triggers

Create triggers for specific conditions:

```yaml
data:
  # Trigger when specific image is deployed
  trigger.on-image-updated: |
    - description: New image deployed
      send:
        - app-deployed
      when: app.status.operationState.phase == 'Succeeded'
      oncePer: app.status.sync.revision

  # Trigger on drift detected
  trigger.on-drift-detected: |
    - description: Application out of sync
      send:
        - drift-alert
      when: app.status.sync.status == 'OutOfSync' and time.Now().Sub(time.Parse(app.status.reconciledAt)).Minutes() > 5

  # Trigger for production only
  trigger.on-prod-deployed: |
    - description: Production deployment
      send:
        - prod-deployed
      when: app.status.operationState.phase == 'Succeeded' and app.spec.destination.namespace == 'production'
```

## Template Functions

ArgoCD notifications support Go templates with additional functions:

```yaml
data:
  template.detailed-notification: |
    message: |
      *Application:* {{.app.metadata.name}}
      *Environment:* {{.app.spec.destination.namespace}}
      *Deployed At:* {{.app.status.operationState.finishedAt | toDate "2006-01-02T15:04:05Z" | date "Jan 02, 2006 15:04 MST"}}
      *Commit:* {{.app.status.sync.revision | substr 0 7}}
      *Author:* {{(call .repo.GetCommitMetadata .app.status.sync.revision).Author}}
      *Message:* {{(call .repo.GetCommitMetadata .app.status.sync.revision).Message}}

      {{if .app.status.operationState.message}}
      *Details:* {{.app.status.operationState.message}}
      {{end}}
```

## Conditional Notifications

Send different notifications based on conditions:

```yaml
data:
  trigger.conditional-alert: |
    - description: Critical for production
      send:
        - critical-alert
      when: app.status.health.status == 'Degraded' and app.spec.destination.namespace == 'production'
    - description: Warning for staging
      send:
        - warning-alert
      when: app.status.health.status == 'Degraded' and app.spec.destination.namespace == 'staging'
```

## Notification Deduplication

Prevent notification spam:

```yaml
data:
  trigger.deduplicated: |
    - description: Send once per revision
      send:
        - app-deployed
      when: app.status.operationState.phase == 'Succeeded'
      oncePer: app.status.sync.revision
```

## Testing Notifications

### Using the CLI

```bash
# List all triggers
argocd admin notifications trigger list

# List all templates
argocd admin notifications template list

# Test a notification
argocd admin notifications test \
  --template app-deployed \
  --recipient slack:deployments \
  myapp
```

### Debug Configuration

```bash
# Check the ConfigMap
kubectl get configmap argocd-notifications-cm -n argocd -o yaml

# View controller logs
kubectl logs -n argocd deployment/argocd-notifications-controller

# Check for annotation issues
kubectl get application myapp -n argocd -o yaml | grep notifications
```

## Common Issues

**Notifications not sending:**
- Verify secret values are correct
- Check controller logs for errors
- Ensure annotations are on the Application

**Duplicate notifications:**
- Add `oncePer` to triggers
- Check if multiple triggers match

**Template errors:**
- Test templates with the CLI
- Verify variable names match app status fields

## Best Practices

### Use Channels Wisely

```yaml
# Different channels for different severity
annotations:
  notifications.argoproj.io/subscribe.on-deployed.slack: deployments
  notifications.argoproj.io/subscribe.on-sync-failed.slack: alerts
  notifications.argoproj.io/subscribe.on-health-degraded.pagerduty: production
```

### Include Actionable Information

```yaml
template.actionable-alert: |
  message: |
    *Action Required:* {{.app.metadata.name}} sync failed

    *Error:* {{.app.status.operationState.message}}

    *Quick Actions:*
    - View: {{.context.argocdUrl}}/applications/{{.app.metadata.name}}
    - Logs: kubectl logs -n {{.app.spec.destination.namespace}} -l app={{.app.metadata.name}}
    - Rollback: argocd app rollback {{.app.metadata.name}}
```

### Avoid Alert Fatigue

Only alert on actionable events:

```yaml
trigger.smart-alerts: |
  - description: Only alert on sustained issues
    send:
      - degraded-alert
    when: app.status.health.status == 'Degraded'
    oncePer: app.status.health.status
```

---

Notifications keep your team informed without constant dashboard watching. Start with basic Slack integration, then expand to include different channels for different severity levels. Good notifications are timely, actionable, and not overwhelming.

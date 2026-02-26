# How to Implement Deployment Notifications Pipeline

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Notifications, Observability

Description: Learn how to build a comprehensive deployment notification pipeline with ArgoCD, including multi-channel alerts, custom templates, escalation policies, and integration with incident management tools.

---

A deployment notification pipeline ensures that the right people know about the right deployment events at the right time. It is not just about sending Slack messages when a sync completes - it is about building a structured communication system that covers the entire deployment lifecycle: pending changes, sync started, health checks running, deployment succeeded or failed, and rollback triggered. This guide covers building a production-grade notification pipeline with ArgoCD Notifications.

## Notification Pipeline Architecture

```mermaid
graph TD
    A[ArgoCD Sync Events] --> B[ArgoCD Notifications Controller]
    B --> C{Event Router}
    C --> D[Slack - Team Channel]
    C --> E[PagerDuty - On-Call]
    C --> F[Email - Stakeholders]
    C --> G[Webhook - Status Dashboard]
    C --> H[GitHub - Commit Status]
    C --> I[Jira - Release Tracking]
```

## Install ArgoCD Notifications

ArgoCD Notifications is included in ArgoCD v2.5+. Verify it is running:

```bash
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-notifications-controller
```

## Configure Notification Services

Set up all the notification channels:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Slack configuration
  service.slack: |
    token: $slack-token
    signingSecret: $slack-signing-secret

  # Email configuration
  service.email: |
    host: smtp.example.com
    port: 587
    from: argocd@example.com
    username: $email-username
    password: $email-password

  # PagerDuty configuration
  service.pagerduty: |
    token: $pagerduty-token
    serviceID: P12345

  # Generic webhook (for dashboards, status pages, etc.)
  service.webhook.status-dashboard: |
    url: https://status.example.com/api/deployments
    headers:
    - name: Authorization
      value: Bearer $dashboard-token
    - name: Content-Type
      value: application/json

  # GitHub commit status
  service.webhook.github: |
    url: https://api.github.com
    headers:
    - name: Authorization
      value: token $github-token
```

Store secrets:

```bash
kubectl create secret generic argocd-notifications-secret \
  --namespace argocd \
  --from-literal=slack-token='xoxb-your-slack-token' \
  --from-literal=pagerduty-token='your-pagerduty-token' \
  --from-literal=github-token='ghp_your-github-token' \
  --from-literal=email-username='argocd@example.com' \
  --from-literal=email-password='your-email-password' \
  --from-literal=dashboard-token='your-dashboard-token'
```

## Define Triggers for Every Deployment Stage

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # --- TRIGGERS ---

  # When new changes are detected but not yet synced
  trigger.on-out-of-sync: |
    - when: app.status.sync.status == 'OutOfSync'
      oncePer: app.status.sync.revision
      send: [slack-pending-changes]

  # When sync operation starts
  trigger.on-sync-running: |
    - when: app.status.operationState.phase in ['Running']
      send: [slack-sync-started, webhook-deployment-started]

  # When sync succeeds and app is healthy
  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
      oncePer: app.status.operationState.syncResult.revision
      send: [slack-deployment-success, github-commit-status-success, webhook-deployment-complete, email-deployment-summary]

  # When sync fails
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      oncePer: app.status.operationState.syncResult.revision
      send: [slack-deployment-failed, pagerduty-deployment-failed, github-commit-status-failed, webhook-deployment-failed]

  # When app health degrades after deployment
  trigger.on-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      send: [slack-health-degraded, pagerduty-health-degraded]

  # When app health returns to healthy
  trigger.on-health-recovered: |
    - when: app.status.health.status == 'Healthy' and time.Now().Sub(time.Parse(app.status.operationState.finishedAt)).Minutes() < 30
      send: [slack-health-recovered]

  # --- TEMPLATES ---

  # Slack: Pending changes notification
  template.slack-pending-changes: |
    slack:
      attachments: |
        [{
          "color": "#f4c030",
          "title": ":hourglass: New changes pending for {{.app.metadata.name}}",
          "fields": [
            {"title": "Environment", "value": "{{.app.spec.destination.namespace}}", "short": true},
            {"title": "Revision", "value": "{{.app.status.sync.revision | trunc 7}}", "short": true}
          ],
          "footer": "Waiting for sync"
        }]

  # Slack: Sync started
  template.slack-sync-started: |
    slack:
      attachments: |
        [{
          "color": "#0076D6",
          "title": ":arrows_counterclockwise: Deploying {{.app.metadata.name}}",
          "fields": [
            {"title": "Environment", "value": "{{.app.spec.destination.namespace}}", "short": true},
            {"title": "Revision", "value": "{{.app.status.operationState.operation.sync.revision | trunc 7}}", "short": true},
            {"title": "Initiated By", "value": "{{.app.status.operationState.operation.initiatedBy.username}}", "short": true}
          ]
        }]

  # Slack: Deployment succeeded
  template.slack-deployment-success: |
    slack:
      attachments: |
        [{
          "color": "#18be52",
          "title": ":white_check_mark: {{.app.metadata.name}} deployed successfully",
          "fields": [
            {"title": "Environment", "value": "{{.app.spec.destination.namespace}}", "short": true},
            {"title": "Revision", "value": "{{.app.status.sync.revision | trunc 7}}", "short": true},
            {"title": "Health", "value": "{{.app.status.health.status}}", "short": true},
            {"title": "Duration", "value": "{{.app.status.operationState.finishedAt}}", "short": true}
          ],
          "actions": [
            {"type": "button", "text": "View in ArgoCD", "url": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"}
          ]
        }]

  # Slack: Deployment failed
  template.slack-deployment-failed: |
    slack:
      attachments: |
        [{
          "color": "#E96D76",
          "title": ":x: DEPLOYMENT FAILED: {{.app.metadata.name}}",
          "fields": [
            {"title": "Environment", "value": "{{.app.spec.destination.namespace}}", "short": true},
            {"title": "Revision", "value": "{{.app.status.operationState.operation.sync.revision | trunc 7}}", "short": true},
            {"title": "Error", "value": "{{.app.status.operationState.message | trunc 300}}", "short": false}
          ],
          "actions": [
            {"type": "button", "text": "View Details", "url": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}"}
          ]
        }]

  # Slack: Health degraded
  template.slack-health-degraded: |
    slack:
      attachments: |
        [{
          "color": "#E96D76",
          "title": ":warning: Health degraded: {{.app.metadata.name}}",
          "text": "Application health has degraded after deployment. Investigate immediately.",
          "fields": [
            {"title": "Environment", "value": "{{.app.spec.destination.namespace}}", "short": true},
            {"title": "Health", "value": "{{.app.status.health.status}}", "short": true}
          ]
        }]

  # Slack: Health recovered
  template.slack-health-recovered: |
    slack:
      attachments: |
        [{
          "color": "#18be52",
          "title": ":green_heart: Health recovered: {{.app.metadata.name}}",
          "fields": [
            {"title": "Environment", "value": "{{.app.spec.destination.namespace}}", "short": true},
            {"title": "Health", "value": "Healthy", "short": true}
          ]
        }]

  # PagerDuty: Deployment failure alert
  template.pagerduty-deployment-failed: |
    pagerduty:
      severity: critical
      summary: "Deployment failed: {{.app.metadata.name}} in {{.app.spec.destination.namespace}}"
      source: "ArgoCD"
      details:
        application: "{{.app.metadata.name}}"
        environment: "{{.app.spec.destination.namespace}}"
        revision: "{{.app.status.operationState.operation.sync.revision}}"
        error: "{{.app.status.operationState.message}}"

  # PagerDuty: Health degradation alert
  template.pagerduty-health-degraded: |
    pagerduty:
      severity: high
      summary: "Health degraded: {{.app.metadata.name}} in {{.app.spec.destination.namespace}}"
      source: "ArgoCD"

  # GitHub: Commit status on success
  template.github-commit-status-success: |
    webhook:
      github:
        method: POST
        path: /repos/{{call .repo.FullNameByRepoURL .app.spec.source.repoURL}}/statuses/{{.app.status.operationState.operation.sync.revision}}
        body: |
          {
            "state": "success",
            "description": "Deployed successfully to {{.app.spec.destination.namespace}}",
            "target_url": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}",
            "context": "argocd/{{.app.metadata.name}}"
          }

  # GitHub: Commit status on failure
  template.github-commit-status-failed: |
    webhook:
      github:
        method: POST
        path: /repos/{{call .repo.FullNameByRepoURL .app.spec.source.repoURL}}/statuses/{{.app.status.operationState.operation.sync.revision}}
        body: |
          {
            "state": "failure",
            "description": "Deployment failed in {{.app.spec.destination.namespace}}",
            "target_url": "{{.context.argocdUrl}}/applications/{{.app.metadata.name}}",
            "context": "argocd/{{.app.metadata.name}}"
          }

  # Webhook: Deployment status to dashboard
  template.webhook-deployment-started: |
    webhook:
      status-dashboard:
        method: POST
        body: |
          {
            "event": "deployment_started",
            "application": "{{.app.metadata.name}}",
            "environment": "{{.app.spec.destination.namespace}}",
            "revision": "{{.app.status.operationState.operation.sync.revision}}",
            "timestamp": "{{.app.status.operationState.startedAt}}"
          }

  template.webhook-deployment-complete: |
    webhook:
      status-dashboard:
        method: POST
        body: |
          {
            "event": "deployment_complete",
            "application": "{{.app.metadata.name}}",
            "environment": "{{.app.spec.destination.namespace}}",
            "revision": "{{.app.status.sync.revision}}",
            "health": "{{.app.status.health.status}}",
            "timestamp": "{{.app.status.operationState.finishedAt}}"
          }

  template.webhook-deployment-failed: |
    webhook:
      status-dashboard:
        method: POST
        body: |
          {
            "event": "deployment_failed",
            "application": "{{.app.metadata.name}}",
            "environment": "{{.app.spec.destination.namespace}}",
            "error": "{{.app.status.operationState.message}}",
            "timestamp": "{{.app.status.operationState.finishedAt}}"
          }

  # Email: Deployment summary
  template.email-deployment-summary: |
    email:
      subject: "[ArgoCD] {{.app.metadata.name}} deployed to {{.app.spec.destination.namespace}}"
      body: |
        Application: {{.app.metadata.name}}
        Environment: {{.app.spec.destination.namespace}}
        Revision: {{.app.status.sync.revision}}
        Health: {{.app.status.health.status}}
        Time: {{.app.status.operationState.finishedAt}}

        View details: {{.context.argocdUrl}}/applications/{{.app.metadata.name}}
```

## Subscribe Applications to Notifications

Annotate applications to receive notifications on specific channels:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-production
  annotations:
    # Slack notifications
    notifications.argoproj.io/subscribe.on-out-of-sync.slack: deployments
    notifications.argoproj.io/subscribe.on-sync-running.slack: deployments
    notifications.argoproj.io/subscribe.on-deployed.slack: deployments
    notifications.argoproj.io/subscribe.on-sync-failed.slack: deployments-alerts
    notifications.argoproj.io/subscribe.on-health-degraded.slack: deployments-alerts

    # PagerDuty for failures
    notifications.argoproj.io/subscribe.on-sync-failed.pagerduty: ""
    notifications.argoproj.io/subscribe.on-health-degraded.pagerduty: ""

    # GitHub commit statuses
    notifications.argoproj.io/subscribe.on-deployed.github: ""
    notifications.argoproj.io/subscribe.on-sync-failed.github: ""

    # Webhook to status dashboard
    notifications.argoproj.io/subscribe.on-sync-running.webhook.status-dashboard: ""
    notifications.argoproj.io/subscribe.on-deployed.webhook.status-dashboard: ""
    notifications.argoproj.io/subscribe.on-sync-failed.webhook.status-dashboard: ""

    # Email to stakeholders
    notifications.argoproj.io/subscribe.on-deployed.email: release-team@example.com
```

## Notification Routing by Environment

Use different notification channels for different environments:

```yaml
# Dev: minimal notifications
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-dev
  annotations:
    notifications.argoproj.io/subscribe.on-sync-failed.slack: dev-alerts
---
# Staging: team notifications
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-staging
  annotations:
    notifications.argoproj.io/subscribe.on-deployed.slack: staging-deploys
    notifications.argoproj.io/subscribe.on-sync-failed.slack: staging-alerts
---
# Production: full notification pipeline
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-production
  annotations:
    notifications.argoproj.io/subscribe.on-out-of-sync.slack: prod-deploys
    notifications.argoproj.io/subscribe.on-deployed.slack: prod-deploys
    notifications.argoproj.io/subscribe.on-sync-failed.slack: prod-alerts
    notifications.argoproj.io/subscribe.on-sync-failed.pagerduty: ""
    notifications.argoproj.io/subscribe.on-health-degraded.pagerduty: ""
```

For comprehensive deployment monitoring beyond notifications, integrate ArgoCD metrics with OneUptime to track deployment frequency, success rates, and mean time to recovery across all your environments.

## Conclusion

A deployment notification pipeline is not just about alerting - it is about creating visibility into the entire deployment lifecycle. By configuring notifications for every stage (pending, started, succeeded, failed, degraded, recovered), routing them to appropriate channels (team Slack for info, PagerDuty for emergencies, email for stakeholders), and feeding deployment events to status dashboards, you create a comprehensive communication system. The key is progressive escalation: info goes to team channels, failures go to alert channels, and critical health degradation pages the on-call engineer. This ensures the right people are informed at the right time without creating notification fatigue.

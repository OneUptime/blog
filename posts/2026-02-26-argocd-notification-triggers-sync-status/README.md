# How to Configure Notification Triggers Based on Sync Status in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Notifications, Monitoring

Description: Learn how to configure ArgoCD notification triggers based on sync status changes to alert teams when applications go OutOfSync, sync successfully, or fail during sync operations.

---

ArgoCD notifications become truly powerful when you configure triggers that fire based on specific sync status transitions. Instead of getting a firehose of alerts, you can set up precise triggers that tell your team exactly when an application drifts out of sync, completes a sync, or hits a sync failure. This guide walks you through configuring those triggers from the ground up.

## Understanding Sync Status in ArgoCD Notifications

ArgoCD tracks several sync statuses for every application:

- **Synced** - the live state matches the desired state in Git
- **OutOfSync** - the live state has drifted from the desired state
- **Unknown** - ArgoCD cannot determine the sync status

Notification triggers evaluate conditions against the application state and fire when those conditions become true. The trigger system uses Go templates with access to the full application object.

## Prerequisites

Before configuring triggers, make sure you have the ArgoCD notifications controller installed. If you installed ArgoCD v2.6 or later, it is bundled in. For older versions, install it separately:

```bash
# Check if notifications controller is running
kubectl get pods -n argocd -l app.kubernetes.io/component=notifications-controller
```

If you need to install it:

```bash
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/notifications_catalog/install.yaml
```

## Configuring the Notification ConfigMap

All trigger definitions live in the `argocd-notifications-cm` ConfigMap. Here is how to set up triggers for each sync status change.

### Trigger for OutOfSync Status

This trigger fires when an application goes OutOfSync, meaning someone either changed the live cluster state directly or pushed new commits to Git that have not been synced yet:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Trigger when app goes OutOfSync
  trigger.on-sync-status-outofsync: |
    - when: app.status.sync.status == 'OutOfSync'
      oncePer: app.status.sync.revision
      send:
        - app-outofsync
```

The `oncePer` field is critical. Without it, ArgoCD would send a notification on every reconciliation loop (roughly every 3 minutes by default). By keying on `app.status.sync.revision`, you get one alert per Git revision that causes the drift.

### Trigger for Successful Sync

This trigger fires when an application transitions to a Synced state after a sync operation completes:

```yaml
  # Trigger when sync succeeds
  trigger.on-sync-succeeded: |
    - when: app.status.sync.status == 'Synced' and app.status.operationState.phase in ['Succeeded']
      send:
        - app-sync-succeeded
```

Notice we check both the sync status and the operation state phase. This prevents false positives - we only want to notify when a sync operation actually ran and completed successfully, not just because the app happens to be in sync.

### Trigger for Failed Sync

Sync failures are usually the most critical alerts. Configure them with high priority:

```yaml
  # Trigger when sync fails
  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send:
        - app-sync-failed
```

### Trigger for Sync Running

Sometimes you want to know when a sync starts, especially for long-running deployments:

```yaml
  # Trigger when sync starts
  trigger.on-sync-running: |
    - when: app.status.operationState.phase in ['Running']
      oncePer: app.status.operationState.startedAt
      send:
        - app-sync-running
```

The `oncePer` is keyed on `startedAt` so you get one notification per sync attempt.

## Building Notification Templates for Sync Status

Each trigger references a template. Here is how to build templates that give your team useful context:

```yaml
  # Template for OutOfSync notification
  template.app-outofsync: |
    message: |
      Application {{.app.metadata.name}} is OutOfSync.
      Sync Status: {{.app.status.sync.status}}
      Current Revision: {{.app.status.sync.revision}}
      Target Revision: {{.app.spec.source.targetRevision}}
      Repo: {{.app.spec.source.repoURL}}
    slack:
      attachments: |
        [{
          "color": "#f4c030",
          "title": "{{.app.metadata.name}} is OutOfSync",
          "text": "Application has drifted from the desired state in Git.",
          "fields": [
            {"title": "Application", "value": "{{.app.metadata.name}}", "short": true},
            {"title": "Revision", "value": "{{.app.status.sync.revision | trunc 7}}", "short": true}
          ]
        }]

  # Template for successful sync
  template.app-sync-succeeded: |
    message: |
      Application {{.app.metadata.name}} synced successfully.
      Revision: {{.app.status.sync.revision}}
    slack:
      attachments: |
        [{
          "color": "#18be52",
          "title": "{{.app.metadata.name}} synced successfully",
          "fields": [
            {"title": "Application", "value": "{{.app.metadata.name}}", "short": true},
            {"title": "Revision", "value": "{{.app.status.sync.revision | trunc 7}}", "short": true}
          ]
        }]

  # Template for failed sync
  template.app-sync-failed: |
    message: |
      Application {{.app.metadata.name}} sync FAILED.
      Error: {{.app.status.operationState.message}}
    slack:
      attachments: |
        [{
          "color": "#e5343a",
          "title": "{{.app.metadata.name}} sync FAILED",
          "text": "{{.app.status.operationState.message}}",
          "fields": [
            {"title": "Application", "value": "{{.app.metadata.name}}", "short": true},
            {"title": "Phase", "value": "{{.app.status.operationState.phase}}", "short": true}
          ]
        }]
```

## Combining Multiple Conditions in a Single Trigger

You can create complex trigger conditions by combining multiple checks:

```yaml
  # Only trigger for production apps that go OutOfSync
  trigger.on-prod-outofsync: |
    - when: >
        app.status.sync.status == 'OutOfSync' and
        app.metadata.labels['environment'] == 'production'
      oncePer: app.status.sync.revision
      send:
        - app-outofsync-prod-urgent
```

This is useful when you want different notification channels or urgency levels for different environments.

## Subscribing Applications to Triggers

After defining triggers, you need to subscribe applications. Add annotations to your Application resources:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  annotations:
    # Subscribe to specific triggers
    notifications.argoproj.io/subscribe.on-sync-status-outofsync.slack: my-channel
    notifications.argoproj.io/subscribe.on-sync-succeeded.slack: my-channel
    notifications.argoproj.io/subscribe.on-sync-failed.slack: alerts-critical
```

You can send different trigger types to different channels. Failed syncs go to the critical alerts channel while routine status changes go to the general channel.

## Using oncePer to Prevent Duplicate Notifications

The `oncePer` field deserves special attention. Without it, you will get flooded with repeat notifications because ArgoCD reconciles applications continuously. Here are common patterns:

```yaml
  # One notification per revision change
  trigger.on-outofsync: |
    - when: app.status.sync.status == 'OutOfSync'
      oncePer: app.status.sync.revision
      send:
        - app-outofsync

  # One notification per operation
  trigger.on-sync-complete: |
    - when: app.status.operationState.phase in ['Succeeded', 'Failed', 'Error']
      oncePer: app.status.operationState.finishedAt
      send:
        - app-sync-complete
```

The value of `oncePer` should be an expression that evaluates to a different string each time you want a new notification sent.

## Full Working ConfigMap Example

Here is a complete, production-ready ConfigMap that covers all sync status transitions:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Service configuration (Slack example)
  service.slack: |
    token: $slack-token

  # Triggers
  trigger.on-sync-status-outofsync: |
    - when: app.status.sync.status == 'OutOfSync'
      oncePer: app.status.sync.revision
      send:
        - app-outofsync

  trigger.on-sync-succeeded: |
    - when: app.status.operationState != nil and app.status.operationState.phase in ['Succeeded'] and app.status.sync.status == 'Synced'
      oncePer: app.status.operationState.finishedAt
      send:
        - app-sync-succeeded

  trigger.on-sync-failed: |
    - when: app.status.operationState != nil and app.status.operationState.phase in ['Error', 'Failed']
      oncePer: app.status.operationState.finishedAt
      send:
        - app-sync-failed

  trigger.on-sync-running: |
    - when: app.status.operationState != nil and app.status.operationState.phase in ['Running']
      oncePer: app.status.operationState.startedAt
      send:
        - app-sync-running

  # Templates
  template.app-outofsync: |
    message: "Application {{.app.metadata.name}} is OutOfSync"
    slack:
      attachments: |
        [{"color": "#f4c030", "title": "{{.app.metadata.name}} - OutOfSync", "text": "Revision: {{.app.status.sync.revision | trunc 7}}"}]

  template.app-sync-succeeded: |
    message: "Application {{.app.metadata.name}} synced successfully"
    slack:
      attachments: |
        [{"color": "#18be52", "title": "{{.app.metadata.name}} - Sync Succeeded", "text": "Revision: {{.app.status.sync.revision | trunc 7}}"}]

  template.app-sync-failed: |
    message: "Application {{.app.metadata.name}} sync FAILED: {{.app.status.operationState.message}}"
    slack:
      attachments: |
        [{"color": "#e5343a", "title": "{{.app.metadata.name}} - Sync Failed", "text": "{{.app.status.operationState.message}}"}]

  template.app-sync-running: |
    message: "Application {{.app.metadata.name}} sync started"
    slack:
      attachments: |
        [{"color": "#0dadea", "title": "{{.app.metadata.name}} - Sync Running", "text": "Started at: {{.app.status.operationState.startedAt}}"}]
```

## Verifying Your Triggers

After applying the ConfigMap, verify that your triggers are loaded:

```bash
# Check the notifications controller logs
kubectl logs -n argocd -l app.kubernetes.io/component=notifications-controller --tail=50

# Look for trigger registration messages
kubectl logs -n argocd -l app.kubernetes.io/component=notifications-controller | grep "trigger"
```

If triggers are not firing, check that the application has the correct subscription annotation and that the `when` condition actually matches the application state.

## Common Pitfalls

**Missing nil checks**: Always check `app.status.operationState != nil` before accessing nested fields. If no sync has ever run, `operationState` is nil and your trigger will error out silently.

**Forgetting oncePer**: Without `oncePer`, you will get a notification every 3 minutes for as long as the condition remains true. This is the number one complaint from teams setting up notifications.

**Overly broad triggers**: A trigger on just `app.status.sync.status == 'Synced'` will fire for every application that is in sync, not just ones that just completed a sync. Combine sync status with operation state to get precise alerts.

Sync status triggers are the foundation of a good ArgoCD notification strategy. Once you have these in place, consider adding [health status triggers](https://oneuptime.com/blog/post/2026-02-26-argocd-notification-triggers-health-status/view) and [different notification channels for success and failure](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-success-vs-failure/view) to build a comprehensive alerting system.

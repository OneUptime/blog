# How to Configure Notification Triggers Based on Health Status in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Notifications, Monitoring

Description: Learn how to set up ArgoCD notification triggers that fire based on application health status changes including Healthy, Degraded, Progressing, and Missing states.

---

Health status in ArgoCD tells you whether your application is actually working, not just whether it matches Git. An application can be perfectly in sync but completely broken if pods are crash-looping. Health-based notification triggers catch these scenarios and alert your team before users notice. This guide covers how to configure triggers for every health status transition.

## ArgoCD Health Status Values

ArgoCD assigns one of these health statuses to every application:

- **Healthy** - all resources are running and passing health checks
- **Degraded** - one or more resources have failed (e.g., CrashLoopBackOff, failed readiness probes)
- **Progressing** - resources are updating (rollout in progress, pods starting up)
- **Suspended** - the application is paused (Argo Rollouts pause, HPA scale-to-zero)
- **Missing** - expected resources do not exist in the cluster
- **Unknown** - health status cannot be determined

## Setting Up Health-Based Triggers

All trigger configuration goes in the `argocd-notifications-cm` ConfigMap. Let us walk through triggers for each important health transition.

### Trigger for Degraded Health

This is the most critical health trigger. It fires when something breaks:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  trigger.on-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      oncePer: app.status.health.status + app.status.sync.revision
      send:
        - app-health-degraded
```

The `oncePer` expression concatenates health status and revision. This means you get one notification per degraded state per revision. If the same revision keeps degrading after a recovery attempt, you will get another notification.

### Trigger for Healthy Status

Knowing when an application recovers is just as important as knowing when it breaks:

```yaml
  trigger.on-health-healthy: |
    - when: app.status.health.status == 'Healthy'
      oncePer: app.status.sync.revision
      send:
        - app-health-healthy
```

### Trigger for Progressing Status

Long-running progressions can indicate stuck rollouts:

```yaml
  trigger.on-health-progressing: |
    - when: app.status.health.status == 'Progressing'
      oncePer: app.status.operationState.startedAt
      send:
        - app-health-progressing
```

### Trigger for Missing Resources

Missing health status means expected resources were not found in the cluster:

```yaml
  trigger.on-health-missing: |
    - when: app.status.health.status == 'Missing'
      oncePer: app.status.sync.revision
      send:
        - app-health-missing
```

### Trigger for Suspended Applications

Applications suspended by Argo Rollouts or other controllers:

```yaml
  trigger.on-health-suspended: |
    - when: app.status.health.status == 'Suspended'
      oncePer: app.status.sync.revision
      send:
        - app-health-suspended
```

## Building Health-Specific Notification Templates

Each trigger needs a corresponding template. Here are templates designed to give operators quick actionable context:

```yaml
  template.app-health-degraded: |
    message: |
      Application {{.app.metadata.name}} is DEGRADED.
      Health: {{.app.status.health.status}}
      Sync: {{.app.status.sync.status}}
    slack:
      attachments: |
        [{
          "color": "#e5343a",
          "title": "{{.app.metadata.name}} - DEGRADED",
          "text": "Application health has degraded. Check pod status and logs immediately.",
          "fields": [
            {"title": "Application", "value": "{{.app.metadata.name}}", "short": true},
            {"title": "Project", "value": "{{.app.spec.project}}", "short": true},
            {"title": "Health", "value": "{{.app.status.health.status}}", "short": true},
            {"title": "Sync", "value": "{{.app.status.sync.status}}", "short": true}
          ]
        }]

  template.app-health-healthy: |
    message: |
      Application {{.app.metadata.name}} is HEALTHY.
    slack:
      attachments: |
        [{
          "color": "#18be52",
          "title": "{{.app.metadata.name}} - Healthy",
          "text": "Application has returned to a healthy state.",
          "fields": [
            {"title": "Application", "value": "{{.app.metadata.name}}", "short": true},
            {"title": "Revision", "value": "{{.app.status.sync.revision | trunc 7}}", "short": true}
          ]
        }]

  template.app-health-progressing: |
    message: |
      Application {{.app.metadata.name}} is Progressing.
    slack:
      attachments: |
        [{
          "color": "#0dadea",
          "title": "{{.app.metadata.name}} - Progressing",
          "text": "Application update is in progress.",
          "fields": [
            {"title": "Application", "value": "{{.app.metadata.name}}", "short": true},
            {"title": "Started", "value": "{{.app.status.operationState.startedAt}}", "short": true}
          ]
        }]

  template.app-health-missing: |
    message: |
      Application {{.app.metadata.name}} has MISSING resources.
    slack:
      attachments: |
        [{
          "color": "#f4c030",
          "title": "{{.app.metadata.name}} - Missing Resources",
          "text": "Expected resources were not found in the target cluster.",
          "fields": [
            {"title": "Application", "value": "{{.app.metadata.name}}", "short": true},
            {"title": "Destination", "value": "{{.app.spec.destination.server}}", "short": true}
          ]
        }]
```

## Combining Health and Sync Status Triggers

The most useful triggers combine health and sync status for precise alerting:

```yaml
  # Alert when app is synced but degraded (deployment broke something)
  trigger.on-sync-succeeded-but-degraded: |
    - when: >
        app.status.sync.status == 'Synced' and
        app.status.health.status == 'Degraded'
      oncePer: app.status.sync.revision
      send:
        - app-sync-broke-health

  # Alert when app is synced AND healthy (everything is good)
  trigger.on-fully-healthy: |
    - when: >
        app.status.sync.status == 'Synced' and
        app.status.health.status == 'Healthy'
      oncePer: app.status.sync.revision
      send:
        - app-fully-healthy
```

The first trigger is especially valuable because it catches the scenario where a sync completes without errors but the resulting deployment is broken. This happens when bad configuration gets merged - the YAML is valid but the application does not work.

## Environment-Specific Health Triggers

Route health alerts to different channels based on environment labels:

```yaml
  # Critical alert for production degradation
  trigger.on-prod-degraded: |
    - when: >
        app.status.health.status == 'Degraded' and
        app.metadata.labels['env'] == 'production'
      oncePer: app.status.health.status + app.status.sync.revision
      send:
        - app-prod-degraded-urgent

  # Informational alert for staging degradation
  trigger.on-staging-degraded: |
    - when: >
        app.status.health.status == 'Degraded' and
        app.metadata.labels['env'] == 'staging'
      oncePer: app.status.health.status + app.status.sync.revision
      send:
        - app-staging-degraded-info
```

## Subscribing Applications to Health Triggers

Add annotations to your Application resources to subscribe to health triggers:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-production-app
  annotations:
    notifications.argoproj.io/subscribe.on-health-degraded.slack: alerts-critical
    notifications.argoproj.io/subscribe.on-health-healthy.slack: deployments
    notifications.argoproj.io/subscribe.on-health-degraded.pagerduty: production-oncall
```

This sends degraded alerts to both Slack and PagerDuty, while healthy recovery notifications only go to the Slack deployments channel.

## Handling the "Progressing Forever" Problem

A common issue is applications that get stuck in Progressing status. You can create a trigger that alerts after a certain condition indicates staleness:

```yaml
  # Alert when progressing but operation finished (likely stuck)
  trigger.on-stuck-progressing: |
    - when: >
        app.status.health.status == 'Progressing' and
        app.status.operationState != nil and
        app.status.operationState.phase in ['Succeeded', 'Failed', 'Error']
      oncePer: app.status.operationState.finishedAt
      send:
        - app-stuck-progressing
```

This catches cases where the sync operation completed but resources are still showing as Progressing, typically due to pods that cannot start or readiness probes that never pass.

## Verifying Health Triggers Work

Test your health triggers by deliberately causing a health change:

```bash
# Scale a deployment to zero to trigger Missing/Degraded
kubectl scale deployment my-app --replicas=0 -n my-namespace

# Watch notification controller logs
kubectl logs -n argocd -l app.kubernetes.io/component=notifications-controller -f

# Scale back up to trigger Healthy
kubectl scale deployment my-app --replicas=1 -n my-namespace
```

## Common Issues

**Health status flapping**: If an application oscillates between Healthy and Degraded, you will get multiple notifications even with `oncePer`. Consider adding a time-based debounce by using a coarser `oncePer` expression.

**Missing operationState**: New applications that have never been synced will have a nil `operationState`. Always add nil checks in triggers that reference operation state fields.

**CRD health checks**: Custom resources might not have health checks defined. ArgoCD reports them as Healthy by default. If you need health notifications for CRDs, configure [custom health checks](https://oneuptime.com/blog/post/2026-02-26-argocd-notification-triggers-sync-status/view) first.

Health-based triggers complement [sync status triggers](https://oneuptime.com/blog/post/2026-02-26-argocd-notification-triggers-sync-status/view) to give you a complete picture of your deployment pipeline. Together, they ensure your team knows both when deployments happen and whether they actually work.

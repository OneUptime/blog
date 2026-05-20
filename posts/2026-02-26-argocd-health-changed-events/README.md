# How to Handle Application Health Changed Events

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Health Monitoring, Automation

Description: Learn how to detect and respond to application health status changes in ArgoCD for automated incident response, alerting, and self-healing workflows.

---

ArgoCD continuously monitors the health of every application it manages. When an application's health is observed as Healthy, Degraded, Progressing, or another state, it represents a significant operational signal. Capturing these health status observations enables automated incident response, proactive alerting, and self-healing workflows.

This guide covers how to detect health changes in ArgoCD, route them to the right systems, and build automation around common health transitions.

## Understanding ArgoCD Health States

ArgoCD defines several health states for applications:

```mermaid
stateDiagram-v2
    [*] --> Missing: Application created
    Missing --> Progressing: Resources being created
    Progressing --> Healthy: All resources ready
    Progressing --> Degraded: Resource failures
    Healthy --> Degraded: Health check failure
    Healthy --> Progressing: Rolling update
    Degraded --> Progressing: Fix applied
    Degraded --> Healthy: Self-healed
    Healthy --> Suspended: Paused rollout
    Suspended --> Progressing: Rollout resumed
    Progressing --> Suspended: Rollout paused
```

- **Healthy**: All resources are running and passing health checks
- **Progressing**: Resources are being created, updated, or rolling out
- **Degraded**: One or more resources are in a failed state
- **Suspended**: A rollout is paused (often used with Argo Rollouts)
- **Missing**: Expected resources do not exist in the cluster
- **Unknown**: Health status could not be determined

## Setting Up Health Change Notifications

Configure ArgoCD Notifications to fire when an application is observed in a health state.

```yaml
# argocd-notifications-cm ConfigMap

apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Trigger on health degraded
  trigger.on-health-degraded: |
    - description: Application health has degraded
      when: app.status.health.status == 'Degraded'
      send:
        - health-degraded-alert
        - health-degraded-incident

  # Trigger when health recovers
  trigger.on-health-recovered: |
    - description: Application health recovered
      when: app.status.health.status == 'Healthy'
      send:
        - health-recovered-notification

  # Trigger on progressing (deployment in progress)
  trigger.on-health-progressing: |
    - description: Application is progressing
      when: app.status.health.status == 'Progressing'
      send:
        - health-progressing-notification

  # Trigger on suspended (paused rollout)
  trigger.on-health-suspended: |
    - description: Application rollout is suspended
      when: app.status.health.status == 'Suspended'
      send:
        - health-suspended-alert

  # Alert template for degraded health
  template.health-degraded-alert: |
    message: |
      Application {{.app.metadata.name}} is degraded.
    slack:
      attachments: |
        [{
          "title": "DEGRADED: {{.app.metadata.name}}",
          "color": "#FF0000",
          "fields": [
            {"title": "Application", "value": "{{.app.metadata.name}}", "short": true},
            {"title": "Health Status", "value": "{{.app.status.health.status}}", "short": true},
            {"title": "Message", "value": "{{.app.status.health.message | default "No message"}}", "short": false},
            {"title": "Namespace", "value": "{{.app.spec.destination.namespace}}", "short": true},
            {"title": "Revision", "value": "{{.app.status.sync.revision | trunc 8}}", "short": true}
          ]
        }]

  # Webhook for incident creation
  template.health-degraded-incident: |
    webhook:
      incident-api:
        method: POST
        body: |
          {
            "title": "ArgoCD Application Degraded: {{.app.metadata.name}}",
            "severity": "{{index .app.metadata.labels "severity" | default "warning"}}",
            "source": "argocd",
            "application": "{{.app.metadata.name}}",
            "namespace": "{{.app.spec.destination.namespace}}",
            "health_status": "{{.app.status.health.status}}",
            "health_message": "{{.app.status.health.message}}",
            "team": "{{index .app.metadata.labels "team" | default "platform"}}",
            "degraded_resources": [
              {{$first := true}}
              {{range .app.status.resources}}
              {{if eq .health.status "Degraded"}}
              {{if not $first}},{{end}}
              {"kind": "{{.kind}}", "name": "{{.name}}", "message": "{{.health.message}}"}
              {{$first = false}}
              {{end}}
              {{end}}
            ]
          }

  # Recovery notification
  template.health-recovered-notification: |
    message: |
      Application {{.app.metadata.name}} health has been restored.
    slack:
      attachments: |
        [{
          "title": "RECOVERED: {{.app.metadata.name}}",
          "color": "#36a64f",
          "fields": [
            {"title": "Application", "value": "{{.app.metadata.name}}", "short": true},
            {"title": "Health Status", "value": "Healthy", "short": true},
            {"title": "Namespace", "value": "{{.app.spec.destination.namespace}}", "short": true}
          ]
        }]

  # Progressing notification
  template.health-progressing-notification: |
    message: |
      Application {{.app.metadata.name}} is progressing.
    slack:
      attachments: |
        [{
          "title": "DEPLOYING: {{.app.metadata.name}}",
          "color": "#FFA500",
          "fields": [
            {"title": "Application", "value": "{{.app.metadata.name}}", "short": true},
            {"title": "Status", "value": "Deployment in progress", "short": true},
            {"title": "Revision", "value": "{{.app.status.sync.revision | trunc 8}}", "short": true}
          ]
        }]

  # Suspended alert
  template.health-suspended-alert: |
    message: |
      Application {{.app.metadata.name}} rollout is suspended.
    slack:
      attachments: |
        [{
          "title": "SUSPENDED: {{.app.metadata.name}}",
          "color": "#9C27B0",
          "fields": [
            {"title": "Application", "value": "{{.app.metadata.name}}", "short": true},
            {"title": "Status", "value": "Rollout paused - manual intervention may be required", "short": false},
            {"title": "Namespace", "value": "{{.app.spec.destination.namespace}}", "short": true}
          ]
        }]

  # Webhook services
  service.slack: |
    token: $slack-token

  service.webhook.incident-api: |
    url: https://oneuptime.com/api/incident
    headers:
      - name: Content-Type
        value: application/json
      - name: Authorization
        value: $oneuptime-api-key
```

## Subscribing Applications to Health Notifications

Add annotations to your applications to subscribe to health events:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service
  labels:
    team: payments
    severity: critical
  annotations:
    notifications.argoproj.io/subscribe.on-health-degraded.slack: payments-alerts
    notifications.argoproj.io/subscribe.on-health-degraded.incident-api: ""
    notifications.argoproj.io/subscribe.on-health-recovered.slack: payments-alerts
    notifications.argoproj.io/subscribe.on-health-progressing.slack: deployments
```

## Building a Self-Healing Workflow

When an application goes degraded, you can trigger automatic remediation.

```yaml
# platform/self-healer/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-self-healer
  namespace: argocd
spec:
  replicas: 1
  selector:
    matchLabels:
      app: argocd-self-healer
  template:
    metadata:
      labels:
        app: argocd-self-healer
    spec:
      containers:
        - name: healer
          image: your-org/argocd-self-healer:latest
          env:
            - name: ARGOCD_SERVER
              value: https://argocd-server.argocd.svc
            - name: ARGOCD_TOKEN
              valueFrom:
                secretKeyRef:
                  name: argocd-self-healer-token
                  key: token
```

The self-healer logic:

```python
# self-healer logic (simplified)
import time
import os
import requests

ARGOCD_SERVER = os.environ['ARGOCD_SERVER']
ARGOCD_TOKEN = os.environ['ARGOCD_TOKEN']

def handle_degraded_event(app_name, degraded_resources):
    """Handle application health degradation."""

    for resource in degraded_resources:
        if resource['kind'] == 'Deployment':
            # Check if it is a CrashLoopBackOff
            if 'CrashLoopBackOff' in resource.get('message', ''):
                # Wait for a grace period
                time.sleep(300)  # 5 minutes

                # Check if still degraded
                if is_still_degraded(app_name):
                    # Rollback to last successful revision
                    rollback_to_last_healthy(app_name)
                    notify(f"Auto-rolled back {app_name} due to CrashLoopBackOff")

        elif resource['kind'] == 'Pod':
            if 'ImagePullBackOff' in resource.get('message', ''):
                # This is likely a bad image tag - rollback
                rollback_to_last_healthy(app_name)
                notify(f"Auto-rolled back {app_name} due to ImagePullBackOff")


def rollback_to_last_healthy(app_name):
    """Rollback application to the last known healthy revision."""
    # Rollbacks require automated sync to be disabled for the application.
    # Get application history
    response = requests.get(
        f'{ARGOCD_SERVER}/api/v1/applications/{app_name}',
        headers={'Authorization': f'Bearer {ARGOCD_TOKEN}'}
    )
    app = response.json()

    # Find the previous revision
    history = app.get('status', {}).get('history', [])
    if len(history) >= 2:
        previous_revision = history[-2]['revision']

        # Trigger sync to previous revision
        requests.post(
            f'{ARGOCD_SERVER}/api/v1/applications/{app_name}/sync',
            json={'revision': previous_revision},
            headers={'Authorization': f'Bearer {ARGOCD_TOKEN}'}
        )
```

## Health Check Customization

ArgoCD's health assessment depends on its understanding of each resource type. Customize health checks for your custom resources or override built-in checks when needed:

```yaml
# argocd-cm ConfigMap
data:
  resource.customizations.health.apps_Deployment: |
    hs = {}
    hs.status = "Progressing"
    if obj.status ~= nil then
      if obj.status.availableReplicas ~= nil and
         obj.status.availableReplicas == obj.spec.replicas then
        hs.status = "Healthy"
      elseif obj.status.unavailableReplicas ~= nil and
             obj.status.unavailableReplicas > 0 then
        hs.status = "Degraded"
        hs.message = obj.status.unavailableReplicas ..
          " replicas unavailable"
      else
        hs.status = "Progressing"
      end
    end
    return hs
```

## Severity-Based Routing

Route health events based on application criticality:

```yaml
trigger.on-critical-degraded: |
  - description: Critical application degraded
    when: >-
      app.status.health.status == 'Degraded' and
      app.metadata.labels["severity"] == 'critical'
    send:
      - pagerduty-critical
      - slack-urgent

trigger.on-standard-degraded: |
  - description: Standard application degraded
    when: >-
      app.status.health.status == 'Degraded' and
      app.metadata.labels["severity"] != 'critical'
    send:
      - slack-warning
```

## Monitoring Health Transitions with Metrics

Export health observations to a metrics collector for dashboarding. The collector can calculate transitions by comparing the new status to the previously stored status for the application:

```yaml
template.health-change-metric: |
  webhook:
    metrics-collector:
      method: POST
      body: |
        {
          "metric": "argocd_app_health_transition",
          "labels": {
            "application": "{{.app.metadata.name}}",
            "status": "{{.app.status.health.status}}",
            "team": "{{index .app.metadata.labels "team"}}"
          },
          "value": 1
        }
```

## Conclusion

Health changed events are the operational heartbeat of your ArgoCD deployment. By routing degraded events to incident management systems like [OneUptime](https://oneuptime.com), sending recovery notifications to reduce alert fatigue, and building self-healing workflows for common failures, you transform ArgoCD from a deployment tool into a complete operational platform. Use severity labels for routing, customize health checks for accurate status reporting, and always pair degraded alerts with recovery notifications so teams know when issues resolve.

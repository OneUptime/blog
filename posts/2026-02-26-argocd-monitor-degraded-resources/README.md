# How to Monitor Degraded Resources in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Monitoring, Observability

Description: Learn how to identify, monitor, and alert on degraded resources in ArgoCD using the UI, CLI, metrics, and notification integrations to catch failing deployments early.

---

Degraded resources in ArgoCD indicate something is genuinely wrong. Unlike "Progressing" which means a resource is still being set up, "Degraded" means the resource has failed and is not going to fix itself without intervention. Missing these signals means downtime goes unnoticed, and the longer a degraded resource sits in your cluster, the worse the impact.

This guide covers every method available for monitoring degraded resources, from quick manual checks to fully automated alerting pipelines.

## Understanding Degraded Status

In ArgoCD's health model, "Degraded" is one of five possible health statuses:

- **Healthy** - Resource is operating normally
- **Progressing** - Resource is being created or updated
- **Degraded** - Resource has a problem that needs attention
- **Suspended** - Resource is intentionally paused
- **Missing** - Resource is expected but does not exist

A resource becomes degraded when ArgoCD's health check (built-in or custom) determines that the resource is in a failed state. For standard Kubernetes resources, this happens when:

- A Deployment has exceeded its progress deadline
- A Pod is in CrashLoopBackOff
- A Job has failed
- A PersistentVolumeClaim is in a "Lost" state

For custom resources, the degraded status depends on whatever logic you have in your Lua health check scripts.

## Monitoring Through the ArgoCD UI

The ArgoCD web interface provides visual indicators for degraded resources. When you open an application, the resource tree shows health status with color-coded icons:

- Green heart: Healthy
- Yellow spinner: Progressing
- Red heart: Degraded
- Gray pause: Suspended

To quickly find degraded resources across all applications:

1. Open the ArgoCD UI
2. Look at the application tiles on the main page - degraded applications show a red health indicator
3. Click into any application to see the resource tree
4. Degraded resources will have red icons and error messages

The UI is useful for manual spot checks but is not sufficient for ongoing monitoring.

## Monitoring with the ArgoCD CLI

The CLI gives you scriptable access to health information:

```bash
# List all applications and their health status
argocd app list -o wide

# Get health status of a specific application
argocd app get my-app -o json | jq '.status.health'

# List all resources in an app with their health
argocd app resources my-app

# Filter to only degraded resources
argocd app resources my-app -o json | jq '.[] | select(.health.status == "Degraded")'
```

You can script this into a monitoring check:

```bash
#!/bin/bash
# check-degraded.sh - Find all degraded applications

DEGRADED_APPS=$(argocd app list -o json | jq -r '.[] | select(.status.health.status == "Degraded") | .metadata.name')

if [ -n "$DEGRADED_APPS" ]; then
  echo "CRITICAL: Degraded applications found:"
  echo "$DEGRADED_APPS"
  for app in $DEGRADED_APPS; do
    echo ""
    echo "=== $app ==="
    argocd app resources "$app" -o json | jq '.[] | select(.health.status == "Degraded") | {name: .name, kind: .kind, message: .health.message}'
  done
  exit 2
else
  echo "OK: No degraded applications"
  exit 0
fi
```

## Monitoring with Prometheus Metrics

ArgoCD exposes Prometheus metrics that track application health status. This is the best approach for production monitoring because it integrates with your existing observability stack.

### Key Metrics for Degraded Detection

The most important metric is `argocd_app_info`, which includes a `health_status` label:

```promql
# Count of degraded applications
count(argocd_app_info{health_status="Degraded"})

# List degraded applications by name
argocd_app_info{health_status="Degraded"}

# Track health status changes over time
changes(argocd_app_info{health_status="Degraded"}[1h])
```

### Prometheus Alert Rules

Set up alerting rules to get notified when applications degrade:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-health-alerts
  namespace: monitoring
spec:
  groups:
    - name: argocd-health
      rules:
        # Alert when any application is degraded
        - alert: ArgoCDApplicationDegraded
          expr: argocd_app_info{health_status="Degraded"} == 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "ArgoCD application {{ $labels.name }} is degraded"
            description: "Application {{ $labels.name }} in project {{ $labels.project }} has been in Degraded health status for more than 5 minutes."

        # Alert when applications have been progressing too long
        - alert: ArgoCDApplicationProgressingTooLong
          expr: argocd_app_info{health_status="Progressing"} == 1
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD application {{ $labels.name }} has been progressing for over 30 minutes"
            description: "Application {{ $labels.name }} might be stuck in a progressing state."

        # Alert when multiple applications are degraded simultaneously
        - alert: ArgoCDMultipleApplicationsDegraded
          expr: count(argocd_app_info{health_status="Degraded"}) > 3
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Multiple ArgoCD applications are degraded"
            description: "{{ $value }} applications are currently in Degraded health status. This may indicate a cluster-wide issue."
```

### Grafana Dashboard Panel

Create a Grafana panel to visualize degraded resource trends:

```json
{
  "title": "Degraded Applications",
  "type": "stat",
  "targets": [
    {
      "expr": "count(argocd_app_info{health_status=\"Degraded\"}) or vector(0)",
      "legendFormat": "Degraded Apps"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "thresholds": {
        "steps": [
          { "value": 0, "color": "green" },
          { "value": 1, "color": "red" }
        ]
      }
    }
  }
}
```

## Monitoring with ArgoCD Notifications

ArgoCD Notifications can send alerts when application health changes to Degraded:

```yaml
# argocd-notifications-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Trigger when health becomes Degraded
  trigger.on-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      send: [app-degraded-slack]

  # Trigger when health recovers from Degraded
  trigger.on-health-recovered: |
    - when: app.status.health.status == 'Healthy' && time.Now().Sub(time.Parse(app.status.health.lastTransitionTime)).Minutes() < 10
      send: [app-recovered-slack]

  # Slack notification template
  template.app-degraded-slack: |
    message: |
      :red_circle: Application *{{.app.metadata.name}}* is DEGRADED
      *Project:* {{.app.spec.project}}
      *Namespace:* {{.app.spec.destination.namespace}}
      *Health:* {{.app.status.health.status}}
      *Sync:* {{.app.status.sync.status}}
      *Revision:* {{.app.status.sync.revision | trunc 7}}

  template.app-recovered-slack: |
    message: |
      :green_circle: Application *{{.app.metadata.name}}* has RECOVERED
      *Health:* {{.app.status.health.status}}

  # Slack service configuration
  service.slack: |
    token: $slack-token
```

Subscribe applications to notifications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  annotations:
    notifications.argoproj.io/subscribe.on-health-degraded.slack: my-alerts-channel
    notifications.argoproj.io/subscribe.on-health-recovered.slack: my-alerts-channel
```

## Building a Degraded Resource Report

For teams that need regular health reports, create a CronJob that generates a summary:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-health-report
  namespace: argocd
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: reporter
              image: argoproj/argocd:latest
              command:
                - /bin/sh
                - -c
                - |
                  argocd login argocd-server --insecure \
                    --username admin \
                    --password $(cat /etc/argocd/password)

                  echo "=== ArgoCD Health Report ==="
                  echo "Generated: $(date)"
                  echo ""

                  TOTAL=$(argocd app list -o json | jq length)
                  HEALTHY=$(argocd app list -o json | jq '[.[] | select(.status.health.status == "Healthy")] | length')
                  DEGRADED=$(argocd app list -o json | jq '[.[] | select(.status.health.status == "Degraded")] | length')
                  PROGRESSING=$(argocd app list -o json | jq '[.[] | select(.status.health.status == "Progressing")] | length')

                  echo "Total: $TOTAL | Healthy: $HEALTHY | Degraded: $DEGRADED | Progressing: $PROGRESSING"
                  echo ""

                  if [ "$DEGRADED" -gt 0 ]; then
                    echo "=== Degraded Applications ==="
                    argocd app list -o json | jq -r '.[] | select(.status.health.status == "Degraded") | "\(.metadata.name) - \(.spec.destination.namespace)"'
                  fi
          restartPolicy: OnFailure
```

## Best Practices

1. **Set appropriate alert thresholds**: A 5-minute `for` duration in Prometheus alerts prevents flapping during normal deployments.

2. **Differentiate severity levels**: A single degraded application is a warning. Multiple degraded applications could indicate a cluster problem and should be critical.

3. **Include context in alerts**: Always include the application name, namespace, project, and current revision in alert messages so responders have the information they need.

4. **Monitor the monitors**: Make sure your ArgoCD metrics endpoint is being scraped. If Prometheus cannot reach ArgoCD, you will not get alerts.

5. **Create runbooks**: For each type of degraded resource, document the investigation and remediation steps.

For setting up ArgoCD metrics, see how to expose ArgoCD Prometheus metrics. For automated responses to degraded health, check out [how to use resource health for automated rollbacks](https://oneuptime.com/blog/post/2026-02-26-argocd-resource-health-automated-rollbacks/view).

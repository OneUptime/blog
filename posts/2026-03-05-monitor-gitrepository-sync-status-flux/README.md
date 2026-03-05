# How to Monitor GitRepository Sync Status in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, GitRepository, Monitoring, Prometheus, Grafana, Observability

Description: Learn how to monitor Flux CD GitRepository synchronization status using CLI tools, Kubernetes events, Prometheus metrics, and Grafana dashboards.

---

Monitoring the sync status of your Flux GitRepository sources is essential for maintaining a healthy GitOps pipeline. When a source fails to reconcile, downstream deployments stall, and without proper monitoring, you might not notice until a user reports an issue. This guide covers multiple approaches to monitoring GitRepository sync status, from simple CLI checks to full Prometheus and Grafana observability.

## Prerequisites

Before you begin, make sure you have:

- A Kubernetes cluster with Flux CD installed
- The Flux CLI (`flux`) installed locally
- `kubectl` access to your cluster
- Prometheus and Grafana (optional, for metrics-based monitoring)

## Step 1: Monitor with the Flux CLI

The Flux CLI provides the quickest way to check the status of all GitRepository sources.

```bash
# List all GitRepository sources across all namespaces
flux get source git -A
```

Sample output:

```text
NAMESPACE     NAME        REVISION              SUSPENDED   READY   MESSAGE
flux-system   my-app      main@sha1:abc123def   False       True    stored artifact for revision 'main@sha1:abc123def'
flux-system   infra       main@sha1:def456ghi   False       True    stored artifact for revision 'main@sha1:def456ghi'
flux-system   charts      main@sha1:ghi789jkl   False       False   failed to checkout: authentication required
```

Filter for sources that are not ready.

```bash
# Show only GitRepository sources that are not ready
flux get source git -A --status-selector ready=false
```

Watch for real-time status changes.

```bash
# Watch GitRepository status updates in real time
flux get source git -A --watch
```

## Step 2: Monitor with kubectl

Use kubectl to get more detailed status information.

```bash
# Get all GitRepository resources with their status conditions
kubectl get gitrepositories -A -o custom-columns=\
'NAMESPACE:.metadata.namespace,NAME:.metadata.name,READY:.status.conditions[?(@.type=="Ready")].status,MESSAGE:.status.conditions[?(@.type=="Ready")].message,REVISION:.status.artifact.revision'
```

Check the last reconciliation time to detect stale sources.

```bash
# Show last reconciliation time for all GitRepository sources
kubectl get gitrepositories -A -o custom-columns=\
'NAMESPACE:.metadata.namespace,NAME:.metadata.name,LAST_RECONCILED:.status.conditions[?(@.type=="Ready")].lastTransitionTime'
```

## Step 3: Monitor with Kubernetes Events

Flux emits Kubernetes events for GitRepository reconciliation successes and failures.

```bash
# View recent events related to GitRepository resources
kubectl get events -n flux-system \
  --field-selector involvedObject.kind=GitRepository \
  --sort-by='.lastTimestamp'
```

For continuous event monitoring.

```bash
# Watch events in real time
kubectl get events -n flux-system \
  --field-selector involvedObject.kind=GitRepository \
  --watch
```

## Step 4: Set Up Flux Notification Controller

The Flux notification controller can send alerts to external systems when GitRepository sources change status. Configure a Provider and an Alert resource.

```yaml
# slack-provider.yaml
# Notification provider for sending alerts to Slack
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: flux-alerts
  secretRef:
    name: slack-webhook-url
---
# Secret containing the Slack webhook URL
apiVersion: v1
kind: Secret
metadata:
  name: slack-webhook-url
  namespace: flux-system
type: Opaque
stringData:
  address: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

```yaml
# gitrepository-alert.yaml
# Alert configuration for GitRepository status changes
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: gitrepository-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: GitRepository
      name: '*'
      namespace: flux-system
```

```bash
# Apply the notification configuration
kubectl apply -f slack-provider.yaml
kubectl apply -f gitrepository-alert.yaml
```

To receive notifications for all severity levels (including successful reconciliations), change `eventSeverity` to `info`.

## Step 5: Monitor with Prometheus Metrics

Flux exposes Prometheus metrics for all its controllers. The source controller provides metrics about GitRepository reconciliation.

First, ensure the source controller has metrics enabled and a ServiceMonitor is configured.

```yaml
# source-controller-servicemonitor.yaml
# ServiceMonitor to scrape Flux source controller metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: source-controller
  namespace: flux-system
spec:
  selector:
    matchLabels:
      app: source-controller
  endpoints:
  - port: http-prom
    interval: 30s
```

Key Flux metrics for GitRepository monitoring:

```bash
# GitRepository reconciliation condition (1 = condition is true)
# gotk_reconcile_condition{kind="GitRepository", name="my-app", type="Ready", status="True"}

# Reconciliation duration in seconds
# gotk_reconcile_duration_seconds{kind="GitRepository", name="my-app"}

# Suspension status (1 = suspended)
# gotk_suspend_status{kind="GitRepository", name="my-app"}
```

## Step 6: Create Prometheus Alerting Rules

Define alerting rules to get notified when GitRepository sources are unhealthy.

```yaml
# flux-source-alerts.yaml
# Prometheus alerting rules for Flux GitRepository monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-source-alerts
  namespace: flux-system
spec:
  groups:
  - name: flux-gitrepository
    rules:
    # Alert when a GitRepository is not ready for more than 15 minutes
    - alert: GitRepositoryNotReady
      expr: |
        gotk_reconcile_condition{kind="GitRepository", type="Ready", status="False"} == 1
      for: 15m
      labels:
        severity: critical
      annotations:
        summary: "GitRepository {{ $labels.name }} in {{ $labels.namespace }} is not ready"
        description: "The GitRepository has been in a not ready state for more than 15 minutes."

    # Alert when a GitRepository has not been reconciled recently
    - alert: GitRepositoryStaleArtifact
      expr: |
        time() - gotk_reconcile_duration_seconds{kind="GitRepository"} > 3600
      for: 30m
      labels:
        severity: warning
      annotations:
        summary: "GitRepository {{ $labels.name }} has a stale artifact"
        description: "The GitRepository has not been successfully reconciled in over an hour."

    # Alert when a GitRepository has been suspended for too long
    - alert: GitRepositorySuspended
      expr: |
        gotk_suspend_status{kind="GitRepository"} == 1
      for: 24h
      labels:
        severity: warning
      annotations:
        summary: "GitRepository {{ $labels.name }} has been suspended for over 24 hours"
```

```bash
# Apply the alerting rules
kubectl apply -f flux-source-alerts.yaml
```

## Step 7: Build a Grafana Dashboard

Create a Grafana dashboard to visualize GitRepository sync status.

```yaml
# grafana-dashboard-configmap.yaml
# Grafana dashboard for Flux GitRepository monitoring
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-gitrepository-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "true"
data:
  flux-gitrepository.json: |
    {
      "title": "Flux GitRepository Status",
      "panels": [
        {
          "title": "GitRepository Ready Status",
          "type": "stat",
          "targets": [
            {
              "expr": "sum(gotk_reconcile_condition{kind='GitRepository', type='Ready', status='True'})",
              "legendFormat": "Ready"
            },
            {
              "expr": "sum(gotk_reconcile_condition{kind='GitRepository', type='Ready', status='False'})",
              "legendFormat": "Not Ready"
            }
          ]
        },
        {
          "title": "Reconciliation Duration",
          "type": "graph",
          "targets": [
            {
              "expr": "gotk_reconcile_duration_seconds{kind='GitRepository'}",
              "legendFormat": "{{ name }}"
            }
          ]
        }
      ]
    }
```

## Step 8: Automated Health Checks

Create a simple script that can run as a CronJob to check GitRepository health.

```yaml
# gitrepo-health-check.yaml
# CronJob that checks GitRepository health every 5 minutes
apiVersion: batch/v1
kind: CronJob
metadata:
  name: flux-health-check
  namespace: flux-system
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: flux-health-checker
          containers:
          - name: health-check
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              # Check for any GitRepository in not ready state
              NOT_READY=$(kubectl get gitrepositories -A \
                -o jsonpath='{range .items[?(@.status.conditions[0].status=="False")]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}')
              if [ -n "$NOT_READY" ]; then
                echo "WARNING: The following GitRepositories are not ready:"
                echo "$NOT_READY"
                exit 1
              else
                echo "All GitRepositories are healthy"
              fi
          restartPolicy: OnFailure
```

## Summary

Monitoring GitRepository sync status in Flux can be done at multiple levels. The Flux CLI and kubectl provide quick, interactive checks. Kubernetes events and the Flux notification controller enable real-time alerting to external systems like Slack. Prometheus metrics and Grafana dashboards offer deep observability with historical data and trend analysis. For production environments, combine the notification controller for immediate alerts with Prometheus-based monitoring for comprehensive coverage. Regardless of the approach you choose, proactive monitoring of your GitRepository sources prevents silent deployment failures.

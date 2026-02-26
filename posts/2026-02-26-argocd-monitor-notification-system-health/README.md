# How to Monitor Notification System Health in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Monitoring, Notifications

Description: Learn how to monitor the health of your ArgoCD notification system by tracking controller metrics, setting up alerts for delivery failures, and building dashboards for notification visibility.

---

Your notification system is only useful if it is working. A broken notification pipeline means your team misses critical deployment failures and health degradations. This guide shows you how to monitor the ArgoCD notifications controller itself, track delivery success rates, and set up alerts that tell you when the notification system needs attention.

## Notifications Controller Metrics

The ArgoCD notifications controller exposes Prometheus metrics on port 9001 by default. These metrics give you visibility into trigger evaluations, delivery attempts, and errors.

### Enabling Metrics Collection

First, make sure the metrics port is accessible. Check the notifications controller deployment:

```bash
# Verify the metrics port is exposed
kubectl get deployment argocd-notifications-controller -n argocd -o json | \
  jq '.spec.template.spec.containers[0].ports'
```

If the port is not exposed, patch the deployment:

```yaml
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
          ports:
            - containerPort: 9001
              name: metrics
```

### Creating a ServiceMonitor for Prometheus

If you use the Prometheus Operator, create a ServiceMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-notifications-controller
  namespace: argocd
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app.kubernetes.io/component: notifications-controller
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

You also need a Service exposing the metrics port:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: argocd-notifications-controller-metrics
  namespace: argocd
  labels:
    app.kubernetes.io/component: notifications-controller
spec:
  ports:
    - port: 9001
      targetPort: metrics
      name: metrics
  selector:
    app.kubernetes.io/component: notifications-controller
```

## Key Metrics to Monitor

### Notification Delivery Metrics

The notifications controller exposes several metrics:

```bash
# Check available metrics
kubectl port-forward -n argocd svc/argocd-notifications-controller-metrics 9001:9001 &
curl -s localhost:9001/metrics | grep "argocd_notifications"
```

Key metrics include:

- `argocd_notifications_deliveries_total` - total notifications sent, labeled by trigger and service
- `argocd_notifications_trigger_eval_total` - total trigger evaluations, labeled by trigger name and result (true/false)

### Monitoring Delivery Success Rate

Create a Prometheus recording rule to track delivery success rates:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-notifications-rules
  namespace: argocd
spec:
  groups:
    - name: argocd-notifications
      rules:
        # Delivery rate per minute
        - record: argocd:notifications:delivery_rate_1m
          expr: sum(rate(argocd_notifications_deliveries_total[1m])) by (service, succeeded)

        # Trigger evaluation rate
        - record: argocd:notifications:trigger_eval_rate_1m
          expr: sum(rate(argocd_notifications_trigger_eval_total[1m])) by (trigger, result)
```

## Setting Up Alerts

### Alert on Notification Delivery Failures

This is the most important alert. If notifications are failing to deliver, your team will not know about deployment problems:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-notifications-alerts
  namespace: argocd
spec:
  groups:
    - name: argocd-notifications-alerts
      rules:
        # Alert when notification deliveries are failing
        - alert: ArgoCDNotificationDeliveryFailures
          expr: |
            sum(rate(argocd_notifications_deliveries_total{succeeded="false"}[5m])) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD notification deliveries are failing"
            description: "Notification delivery failures detected in the last 5 minutes. Check the notifications controller logs."

        # Alert when the notifications controller is down
        - alert: ArgoCDNotificationsControllerDown
          expr: |
            absent(up{job="argocd-notifications-controller-metrics"} == 1)
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "ArgoCD notifications controller is down"
            description: "The ArgoCD notifications controller has been unreachable for 2 minutes. No notifications will be sent."

        # Alert when no triggers are evaluating (possible configuration issue)
        - alert: ArgoCDNotificationTriggersStalled
          expr: |
            sum(rate(argocd_notifications_trigger_eval_total[10m])) == 0
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD notification triggers are not evaluating"
            description: "No trigger evaluations detected in the last 15 minutes. Check if the notifications controller is configured correctly."
```

## Monitoring Controller Pod Health

Beyond metrics, monitor the notifications controller pod itself:

### Liveness and Readiness

Ensure the controller has health probes configured:

```yaml
spec:
  containers:
    - name: argocd-notifications-controller
      livenessProbe:
        httpGet:
          path: /healthz
          port: 9001
        initialDelaySeconds: 30
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /healthz
          port: 9001
        initialDelaySeconds: 5
        periodSeconds: 5
```

### Resource Usage Monitoring

Track the controller's resource consumption to detect memory leaks or CPU spikes:

```yaml
# Alert on high memory usage
- alert: ArgoCDNotificationsControllerHighMemory
  expr: |
    container_memory_working_set_bytes{
      namespace="argocd",
      container="argocd-notifications-controller"
    } > 256 * 1024 * 1024
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "ArgoCD notifications controller using more than 256MB memory"

# Alert on frequent restarts
- alert: ArgoCDNotificationsControllerRestarts
  expr: |
    increase(kube_pod_container_status_restarts_total{
      namespace="argocd",
      container="argocd-notifications-controller"
    }[1h]) > 2
  labels:
    severity: warning
  annotations:
    summary: "ArgoCD notifications controller restarting frequently"
```

## Building a Grafana Dashboard

Create a Grafana dashboard to visualize notification system health:

```json
{
  "dashboard": {
    "title": "ArgoCD Notifications Health",
    "panels": [
      {
        "title": "Notification Deliveries per Minute",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(argocd_notifications_deliveries_total[1m])) by (service, succeeded)",
            "legendFormat": "{{service}} - succeeded={{succeeded}}"
          }
        ]
      },
      {
        "title": "Trigger Evaluations per Minute",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(argocd_notifications_trigger_eval_total[1m])) by (trigger)",
            "legendFormat": "{{trigger}}"
          }
        ]
      },
      {
        "title": "Delivery Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(argocd_notifications_deliveries_total{succeeded='true'}[5m])) / sum(rate(argocd_notifications_deliveries_total[5m])) * 100"
          }
        ]
      },
      {
        "title": "Controller Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "container_memory_working_set_bytes{namespace='argocd', container='argocd-notifications-controller'}"
          }
        ]
      }
    ]
  }
}
```

## Log-Based Monitoring

If you use a log aggregation system like Loki or Elasticsearch, set up log-based alerts:

```yaml
# Loki alert rule example
groups:
  - name: argocd-notifications-logs
    rules:
      - alert: ArgoCDNotificationErrors
        expr: |
          count_over_time(
            {namespace="argocd", container="argocd-notifications-controller"}
            |= "error"
            |~ "failed to (send|deliver|notify)"
            [5m]
          ) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "ArgoCD notification errors detected in logs"
```

## Monitoring Notification State

ArgoCD stores notification state as annotations on applications. You can monitor these for anomalies:

```bash
# Count applications with notification state
kubectl get applications -n argocd -o json | \
  jq '[.items[] | select(.metadata.annotations["notified.notifications.argoproj.io"] != null)] | length'

# Find applications that have never been notified
kubectl get applications -n argocd -o json | \
  jq '[.items[] |
    select(.metadata.annotations["notified.notifications.argoproj.io"] == null) |
    select(.metadata.annotations | to_entries[] | .key | startswith("notifications.argoproj.io/subscribe"))
  ] | .[].metadata.name'
```

If an application has subscription annotations but no notification state, it might indicate that triggers are not matching or there is a configuration issue.

## Health Check Script

Create a simple health check that runs periodically:

```bash
#!/bin/bash
# check-notification-health.sh

echo "=== ArgoCD Notifications Health Check ==="

# 1. Controller running?
CONTROLLER=$(kubectl get pods -n argocd \
  -l app.kubernetes.io/component=notifications-controller \
  -o jsonpath='{.items[0].status.phase}')
echo "Controller status: $CONTROLLER"

# 2. ConfigMap exists?
CM=$(kubectl get configmap argocd-notifications-cm -n argocd -o name 2>/dev/null)
echo "ConfigMap: ${CM:-MISSING}"

# 3. Secret exists?
SECRET=$(kubectl get secret argocd-notifications-secret -n argocd -o name 2>/dev/null)
echo "Secret: ${SECRET:-MISSING}"

# 4. Count configured triggers
TRIGGERS=$(kubectl get configmap argocd-notifications-cm -n argocd -o json | \
  jq -r '[.data // {} | keys[] | select(startswith("trigger."))] | length')
echo "Configured triggers: $TRIGGERS"

# 5. Count configured services
SERVICES=$(kubectl get configmap argocd-notifications-cm -n argocd -o json | \
  jq -r '[.data // {} | keys[] | select(startswith("service."))] | length')
echo "Configured services: $SERVICES"

# 6. Recent errors in logs
ERRORS=$(kubectl logs -n argocd \
  -l app.kubernetes.io/component=notifications-controller \
  --tail=100 2>/dev/null | grep -c -i "error\|fail")
echo "Recent log errors: $ERRORS"
```

## The Meta-Alert Problem

There is a fundamental challenge: how do you get alerted that your alerting system is broken? Some strategies:

**Use a different notification path for monitoring alerts**: If your ArgoCD notifications go through Slack, send your notification health alerts through PagerDuty or email directly from Prometheus Alertmanager.

**Heartbeat monitoring**: Send a periodic test notification and verify receipt externally. Services like OneUptime can monitor for expected heartbeat signals.

**External health checks**: Use an external monitoring tool to periodically check that the notifications controller metrics endpoint responds.

Monitoring your notification system prevents the worst-case scenario: a production deployment fails, the notification system is also broken, and nobody knows until a customer reports the problem. For debugging specific delivery issues, see [how to debug notification delivery failures](https://oneuptime.com/blog/post/2026-02-26-argocd-debug-notification-delivery-failures/view).

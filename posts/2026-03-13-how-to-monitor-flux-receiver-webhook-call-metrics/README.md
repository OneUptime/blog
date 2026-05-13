# How to Monitor Flux Receiver Webhook Call Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, Webhook, Monitoring, Prometheus, Grafana, Metric, Observability

Description: A complete guide to monitoring Flux Receiver webhook calls using Prometheus metrics, Grafana dashboards, and alerting rules to track delivery success rates and latency.

---

Monitoring your Flux Receiver webhook calls is essential for understanding whether webhooks are arriving reliably, how long they take to process, and whether authentication failures indicate a misconfiguration or an attack. The Flux notification-controller exposes Prometheus metrics out of the box for controller operations, while per-request webhook details are best monitored through controller logs.

This guide covers how to scrape these metrics, build dashboards, and set up alerts for common failure scenarios.

## Prerequisites

- A Kubernetes cluster with Flux CD installed and bootstrapped.
- A Flux Receiver configured and exposed externally.
- Prometheus installed in the cluster (kube-prometheus-stack or standalone).
- Grafana accessible for dashboard creation.
- `kubectl` and `flux` CLI tools available.

Verify Flux and Prometheus are running:

```bash
flux check
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus
```

## Step 1: Understand the Available Metrics

The Flux notification-controller exposes controller metrics on port 8080 at the `/metrics` endpoint. Receiver readiness is a resource-state signal that can be exported through kube-state-metrics when Flux custom resource metrics are configured. Key metrics related to Receivers include:

- `gotk_resource_info`: The current state of Flux custom resources, including Receiver readiness, when Flux custom resource metrics are enabled in kube-state-metrics.
- `gotk_reconcile_duration_seconds`: How long it takes to reconcile a Receiver resource.
- `controller_runtime_reconcile_total`: Total reconciliation count by controller and result.
- `controller_runtime_reconcile_errors_total`: Total reconciliation errors.
- `workqueue_depth`: Number of items waiting to be processed.
- `rest_client_requests_total`: Kubernetes API requests made by the controller (relevant for patching target resources).

The notification-controller also logs HTTP request information that can be parsed by log-based monitoring systems.

## Step 2: Configure Prometheus to Scrape the Notification Controller

### Option A: ServiceMonitor (kube-prometheus-stack)

If you use the kube-prometheus-stack, create a ServiceMonitor:

```yaml
# servicemonitor.yaml

apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: notification-controller
  namespace: flux-system
  labels:
    # Match the label selector used by your Prometheus instance
    release: kube-prometheus-stack
spec:
  endpoints:
    - port: http-prom
      path: /metrics
      interval: 30s
      scrapeTimeout: 10s
  namespaceSelector:
    matchNames:
      - flux-system
  selector:
    matchLabels:
      app: notification-controller
```

Apply it:

```bash
kubectl apply -f servicemonitor.yaml
```

Verify the service has the expected port name:

```bash
kubectl -n flux-system get svc notification-controller -o yaml | grep -A 5 "ports:"
```

If the port name differs, update the ServiceMonitor accordingly.

### Option B: PodMonitor

If the notification-controller does not have a service with the metrics port, use a PodMonitor instead:

```yaml
# podmonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: notification-controller
  namespace: flux-system
  labels:
    release: kube-prometheus-stack
spec:
  podMetricsEndpoints:
    - port: http-prom
      path: /metrics
      interval: 30s
  namespaceSelector:
    matchNames:
      - flux-system
  selector:
    matchLabels:
      app: notification-controller
```

### Option C: Prometheus Annotations

For standalone Prometheus deployments that use annotation-based discovery, annotate the notification-controller service:

```bash
kubectl -n flux-system annotate svc notification-controller \
  prometheus.io/scrape="true" \
  prometheus.io/port="8080" \
  prometheus.io/path="/metrics"
```

## Step 3: Verify Metrics Are Being Scraped

Check that Prometheus is scraping the target:

```bash
# Port-forward to Prometheus
kubectl -n monitoring port-forward svc/prometheus-kube-prometheus-prometheus 9090:9090 &

# Query a controller metric
curl -s "http://localhost:9090/api/v1/query?query=gotk_reconcile_duration_seconds_count" | python3 -m json.tool | head -20

# If Flux custom resource metrics are enabled in kube-state-metrics, query Receiver state
curl -s "http://localhost:9090/api/v1/query?query=gotk_resource_info%7Bcustomresource_kind%3D%22Receiver%22%7D" | python3 -m json.tool | head -20
```

You should see controller metrics with labels like `kind="Receiver"` and `name="github-receiver"`. If kube-state-metrics is exporting Flux resource state, you should also see `gotk_resource_info` series with labels like `customresource_kind="Receiver"`, `name="github-receiver"`, and `ready="True"`.

## Step 4: Create Grafana Dashboards

### Import the Official Flux Dashboard

Flux provides an official Grafana dashboard. Import it using the dashboard ID:

```bash
# The official Flux Cluster Stats dashboard ID
# Import via Grafana UI: Dashboards > Import > Enter ID 14936
```

### Custom Receiver Webhook Dashboard

For a dashboard focused specifically on Receiver webhook activity, create a custom dashboard with these panels:

#### Panel 1: Receiver Readiness

```promql
# PromQL: Current readiness status of all Receivers
max by (exported_namespace, name) (gotk_resource_info{customresource_kind="Receiver", ready="True"}) or max by (exported_namespace, name) (gotk_resource_info{customresource_kind="Receiver", ready!="True"} * 0)
```

Display as a stat panel with value mappings: 1 = Ready (green), 0 = Not Ready (red).

#### Panel 2: Reconciliation Rate

```promql
# PromQL: Reconciliations per minute for Receivers
rate(controller_runtime_reconcile_total{controller="receiver"}[5m]) * 60
```

Display as a time series graph. Spikes indicate webhook activity.

#### Panel 3: Reconciliation Errors

```promql
# PromQL: Error rate for Receiver reconciliations
rate(controller_runtime_reconcile_errors_total{controller="receiver"}[5m]) * 60
```

Display as a time series graph with red color. Any non-zero value warrants investigation.

#### Panel 4: Reconciliation Duration

```promql
# PromQL: 95th percentile reconciliation duration
histogram_quantile(0.95, sum by (le) (rate(gotk_reconcile_duration_seconds_bucket{kind="Receiver"}[5m])))
```

Display as a time series graph showing latency trends.

#### Panel 5: Kubernetes API Requests from Notification Controller

```promql
# PromQL: API requests for patching resources (the annotation update)
rate(rest_client_requests_total{namespace="flux-system", job="notification-controller"}[5m])
```

This shows how many Kubernetes API calls the notification-controller is making, which correlates with webhook processing.

#### Panel 6: Work Queue Depth

```promql
# PromQL: Items waiting to be processed
workqueue_depth{name="receiver"}
```

A persistently high queue depth means the controller is falling behind.

### Dashboard JSON Template

Save this as a dashboard JSON and import it into Grafana:

```json
{
  "title": "Flux Receiver Webhook Metrics",
  "panels": [
    {
      "title": "Receiver Readiness",
      "type": "stat",
      "targets": [
        {
          "expr": "max by (exported_namespace, name) (gotk_resource_info{customresource_kind=\"Receiver\", ready=\"True\"}) or max by (exported_namespace, name) (gotk_resource_info{customresource_kind=\"Receiver\", ready!=\"True\"} * 0)",
          "legendFormat": "{{name}}"
        }
      ]
    },
    {
      "title": "Webhook-Triggered Reconciliations / min",
      "type": "timeseries",
      "targets": [
        {
          "expr": "rate(controller_runtime_reconcile_total{controller=\"receiver\"}[5m]) * 60",
          "legendFormat": "{{result}}"
        }
      ]
    },
    {
      "title": "Reconciliation Errors / min",
      "type": "timeseries",
      "targets": [
        {
          "expr": "rate(controller_runtime_reconcile_errors_total{controller=\"receiver\"}[5m]) * 60",
          "legendFormat": "errors"
        }
      ]
    }
  ]
}
```

## Step 5: Set Up Alerting Rules

Create PrometheusRule resources to alert on common failure scenarios:

```yaml
# flux-receiver-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-receiver-alerts
  namespace: flux-system
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: flux-receiver
      interval: 1m
      rules:
        # Alert when a Receiver is not ready for more than 5 minutes
        - alert: FluxReceiverNotReady
          expr: gotk_resource_info{customresource_kind="Receiver", ready!="True"} == 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Flux Receiver {{ $labels.name }} is not ready"
            description: "Receiver {{ $labels.name }} in namespace {{ $labels.namespace }} has been not ready for more than 5 minutes."

        # Alert on high reconciliation error rate
        - alert: FluxReceiverReconciliationErrors
          expr: rate(controller_runtime_reconcile_errors_total{controller="receiver"}[5m]) > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Flux Receiver reconciliation errors detected"
            description: "The notification-controller is experiencing reconciliation errors for Receivers. Check the controller logs."

        # Alert when the work queue is backed up
        - alert: FluxReceiverQueueBacklog
          expr: workqueue_depth{name="receiver"} > 10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Flux Receiver work queue is backed up"
            description: "The Receiver work queue has {{ $value }} items pending, indicating the controller cannot keep up with incoming webhooks."

        # Alert when no webhooks have been received in 24 hours (staleness check)
        - alert: FluxReceiverNoActivity
          expr: changes(controller_runtime_reconcile_total{controller="receiver"}[24h]) == 0
          labels:
            severity: info
          annotations:
            summary: "No Flux Receiver activity in 24 hours"
            description: "No webhook-triggered reconciliations have occurred in the last 24 hours. Verify that webhook delivery is still configured and functional."
```

Apply the alert rules:

```bash
kubectl apply -f flux-receiver-alerts.yaml
```

## Step 6: Log-Based Monitoring

For detailed per-request monitoring, parse the notification-controller logs. The controller logs each webhook request with the Receiver name, result, and any errors.

### Structured Logging with Loki

If you use Grafana Loki, query webhook handling logs:

```text
{namespace="flux-system", container="manager"} |= "receiver" | json | level="info"
```

Filter for errors:

```text
{namespace="flux-system", container="manager"} |= "receiver" | json | level="error"
```

### Log Pattern for Successful Webhook

A successful webhook handling produces log entries like:

```json
{"level":"info","msg":"handling request","receiver":"flux-system/github-receiver"}
{"level":"info","msg":"annotating resource","resource":"flux-system/flux-system","kind":"GitRepository"}
```

### Log Pattern for Failed Webhook

A failed webhook produces entries like:

```json
{"level":"error","msg":"signature verification failed","receiver":"flux-system/github-receiver"}
```

## Verification

Verify that metrics are being collected and alerts are configured:

```bash
# Check ServiceMonitor is detected
kubectl -n flux-system get servicemonitor notification-controller

# Check PrometheusRule is loaded
kubectl -n flux-system get prometheusrule flux-receiver-alerts

# Verify the notification-controller metrics endpoint is accessible
kubectl -n flux-system port-forward svc/notification-controller 8080:8080 &
curl -s http://localhost:8080/metrics | grep gotk_reconcile_duration
```

Send a test webhook and watch the metrics change in Grafana.

## Troubleshooting

### Metrics not appearing in Prometheus

Verify the ServiceMonitor labels match the Prometheus operator's label selector:

```bash
kubectl -n monitoring get prometheus -o jsonpath='{.items[0].spec.serviceMonitorSelector}'
```

The ServiceMonitor must have labels that match this selector.

### gotk_resource_info metric missing

Ensure kube-state-metrics is configured to export Flux custom resource metrics. The notification-controller exposes controller metrics, but Flux resource-state metrics such as `gotk_resource_info` are collected from the Kubernetes API by kube-state-metrics.

```bash
kubectl -n monitoring get deploy -l app.kubernetes.io/name=kube-state-metrics
```

### Alerts not firing

Check that the PrometheusRule is being loaded:

```bash
kubectl -n monitoring logs deploy/prometheus-operator --since=5m | grep "flux-receiver"
```

Also verify the alert expression returns data in the Prometheus UI.

### High cardinality concerns

If you have many Receivers, the metrics cardinality grows with each unique label combination. Monitor Prometheus memory usage and consider aggregating metrics if needed.

## Summary

Monitoring Flux Receiver webhook calls requires scraping the notification-controller's Prometheus metrics endpoint, building dashboards around reconciliation rates and error counts, and setting up alerts for readiness failures, error spikes, and queue backlogs. Combined with log-based monitoring through Loki or similar tools, this gives you full visibility into the health and performance of your webhook-driven GitOps pipeline.

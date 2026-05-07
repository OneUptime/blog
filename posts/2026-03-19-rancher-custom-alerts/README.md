# How to Set Up Custom Alerts in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Monitoring, Alerting, Prometheus

Description: A practical guide to creating custom alert rules in Rancher using PrometheusRules for cluster and application monitoring.

Rancher's monitoring stack includes a robust alerting system built on Prometheus alerting rules and Alertmanager. While Rancher provides several default alerts out of the box, you will likely need custom alerts tailored to your applications and operational requirements. This guide walks through creating, configuring, and testing custom alerts.

## Prerequisites

- Rancher v2.6 or later with the Monitoring chart installed.
- Cluster admin or project owner permissions.
- Familiarity with PromQL (Prometheus Query Language).

## Understanding the Alerting Architecture

The alerting pipeline in Rancher works as follows:

1. **PrometheusRule** resources define alert conditions using PromQL expressions.
2. **Prometheus** evaluates these rules at regular intervals.
3. When a rule condition is met, Prometheus sends the alert to **Alertmanager**.
4. Alertmanager handles deduplication, grouping, and routing of alerts to notification channels.

## Step 1: Create a PrometheusRule via the Rancher UI

1. Navigate to your cluster in the Rancher UI.
2. Go to **Monitoring > Advanced > PrometheusRules**.
3. Click **Create**.
4. Fill in the form:
   - **Name**: A descriptive name for the rule group.
   - **Namespace**: `cattle-monitoring-system` for cluster-wide rules, or a specific namespace.
5. Define your alert rule with a PromQL expression, severity label, and annotations.

## Step 2: Create a PrometheusRule via YAML

For more control, create alerts using YAML manifests. Here is an example that creates a high CPU usage alert:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: custom-cluster-alerts
  namespace: cattle-monitoring-system
  labels:
    app: rancher-monitoring
    release: rancher-monitoring
spec:
  groups:
    - name: custom-cluster-rules
      interval: 30s
      rules:
        - alert: HighCPUUsage
          expr: |
            100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High CPU usage detected on {{ $labels.instance }}"
            description: "CPU usage is above 85% on node {{ $labels.instance }} for more than 10 minutes. Current value: {{ $value }}%"
```

Apply the manifest:

```bash
kubectl apply -f custom-cluster-alerts.yaml
```

## Step 3: Create Application-Level Alerts

Here are examples of common application-level alerts:

### High Error Rate Alert

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: app-error-alerts
  namespace: cattle-monitoring-system
  labels:
    app: rancher-monitoring
    release: rancher-monitoring
spec:
  groups:
    - name: application-errors
      rules:
        - alert: HighErrorRate
          expr: |
            sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)
            /
            sum(rate(http_requests_total[5m])) by (service)
            > 0.05
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "High error rate on {{ $labels.service }}"
            description: "Service {{ $labels.service }} has more than 5% error rate. Current value: {{ $value | humanizePercentage }}"
```

### Pod Restart Alert

```yaml
        - alert: PodFrequentRestart
          expr: |
            increase(kube_pod_container_status_restarts_total[1h]) > 5
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is restarting frequently"
            description: "Pod {{ $labels.pod }} in namespace {{ $labels.namespace }} has restarted more than 5 times in the last hour."
```

### Persistent Volume Usage Alert

```yaml
        - alert: PVCNearlyFull
          expr: |
            kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes > 0.85
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "PVC {{ $labels.persistentvolumeclaim }} is nearly full"
            description: "PVC {{ $labels.persistentvolumeclaim }} in namespace {{ $labels.namespace }} is {{ $value | humanizePercentage }} full."
```

## Step 4: Configure Alert Severity Levels

Use consistent severity labels to enable proper routing. A common convention:

- **critical** - Requires immediate attention. Pages the on-call engineer.
- **warning** - Needs attention soon but is not immediately impacting service.
- **info** - Informational alerts for awareness.

```yaml
labels:
  severity: critical
  team: platform
  service: api-gateway
```

Additional labels like `team` and `service` help route alerts to the right people.

## Step 5: Configure Alert Inhibition

Prevent redundant alerts by configuring inhibition rules in Alertmanager. If you are configuring the `rancher-monitoring` chart values, you can add inhibition rules under `alertmanager.config`. For example, inhibit warning alerts when a critical alert fires for the same alert in the same namespace:

```yaml
alertmanager:
  config:
    inhibit_rules:
      - source_matchers:
          - 'severity = critical'
        target_matchers:
          - 'severity = warning'
        equal:
          - namespace
          - alertname
```

## Step 6: Test Your Alert Rules

Verify that your PrometheusRule exists in the namespace where you created it:

```bash
kubectl get prometheusrules -A
```

Check the Prometheus UI for your rules:

1. Open Prometheus (via the Rancher Monitoring page or port-forward).
2. Navigate to **Status > Rules**.
3. Verify your alert rules appear and their state is either `inactive`, `pending`, or `firing`.

To test an alert, you can temporarily lower the threshold to trigger it:

```yaml
        - alert: TestAlert
          expr: vector(1)
          for: 1m
          labels:
            severity: info
          annotations:
            summary: "This is a test alert"
```

After confirming the alert fires correctly, remove the test rule.

## Step 7: Verify Alerts in Alertmanager

Once an alert fires, verify it appears in Alertmanager:

1. Open Alertmanager from the Rancher Monitoring page.
2. Check the **Alerts** tab for active alerts.
3. Verify the alert has the correct labels and annotations.

Via CLI:

```bash
kubectl port-forward -n cattle-monitoring-system svc/rancher-monitoring-alertmanager 9093:9093
```

Then access `http://localhost:9093/#/alerts`.

## Common PromQL Patterns for Alerts

Here are useful PromQL expressions for common alert scenarios:

```promql
# Node memory usage above 90%

(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) > 0.9

# Deployment has fewer ready replicas than desired
kube_deployment_status_replicas_available < kube_deployment_spec_replicas

# Container OOMKilled
kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} == 1

# API server latency above 1 second
histogram_quantile(0.99, sum(rate(apiserver_request_duration_seconds_bucket[5m])) by (le, verb)) > 1
```

## Summary

Custom alerts in Rancher are created through PrometheusRule resources. Define your alert conditions using PromQL, set appropriate severity levels and descriptive annotations, and verify they appear in both Prometheus and Alertmanager. Combine custom alerts with proper notification channels and inhibition rules to build a reliable alerting system for your Kubernetes clusters.

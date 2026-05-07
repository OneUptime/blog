# How to Set Up Monitoring for Specific Namespaces in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Monitoring, Prometheus, Grafana

Description: Learn how to configure targeted monitoring for specific Kubernetes namespaces in Rancher with custom dashboards and alerts.

In large Kubernetes clusters, monitoring every namespace equally can be overwhelming and resource-intensive. Targeting monitoring to specific namespaces helps teams focus on their own workloads and reduces noise. This guide covers how to set up namespace-scoped monitoring in Rancher using ServiceMonitors, PrometheusRules, and Grafana dashboards.

## Prerequisites

- Rancher v2.6 or later with the Monitoring chart installed.
- Cluster admin permissions to update the Monitoring app configuration, plus access to create resources in the target namespaces.
- At least one application deployed in a target namespace.

## Step 1: Configure Prometheus to Discover Namespace Resources

By default, Rancher's Prometheus is configured to discover ServiceMonitors, PodMonitors, and PrometheusRules across all namespaces. Verify these settings:

```yaml
prometheus:
  prometheusSpec:
    serviceMonitorNamespaceSelector: {}
    serviceMonitorSelector:
      matchLabels:
        release: rancher-monitoring
    podMonitorNamespaceSelector: {}
    podMonitorSelector:
      matchLabels:
        release: rancher-monitoring
    ruleNamespaceSelector: {}
    ruleSelector:
      matchLabels:
        release: rancher-monitoring
```

An empty `serviceMonitorNamespaceSelector` means all namespaces are watched. To restrict discovery to specific namespaces:

```yaml
prometheus:
  prometheusSpec:
    serviceMonitorNamespaceSelector:
      matchLabels:
        monitoring: enabled
    podMonitorNamespaceSelector:
      matchLabels:
        monitoring: enabled
    ruleNamespaceSelector:
      matchLabels:
        monitoring: enabled
```

Then label the namespaces you want to monitor:

```bash
kubectl label namespace production monitoring=enabled
kubectl label namespace staging monitoring=enabled
```

## Step 2: Create Namespace-Specific ServiceMonitors

Deploy a ServiceMonitor scoped to a specific namespace:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: production-app-monitor
  namespace: production
  labels:
    release: rancher-monitoring
spec:
  namespaceSelector:
    matchNames:
      - production
  selector:
    matchLabels:
      app: my-application
  endpoints:
    - port: metrics
      path: /metrics
      interval: 30s
```

This ServiceMonitor only scrapes services with the `app: my-application` label in the `production` namespace.

## Step 3: Create Namespace-Specific Alerts

Create PrometheusRules that only apply to specific namespaces:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: production-alerts
  namespace: production
  labels:
    app: rancher-monitoring
    release: rancher-monitoring
spec:
  groups:
    - name: production-namespace-alerts
      rules:
        - alert: ProductionPodNotReady
          expr: |
            kube_pod_status_phase{namespace="production", phase=~"Pending|Unknown"} > 0
          for: 10m
          labels:
            severity: critical
            team: production
            namespace: production
          annotations:
            summary: "Production pod {{ $labels.pod }} is pending or unknown"
            description: "Pod {{ $labels.pod }} has been in {{ $labels.phase }} phase for 10 minutes."

        - alert: ProductionHighErrorRate
          expr: |
            sum(rate(http_requests_total{namespace="production", status=~"5.."}[5m])) by (service)
            /
            sum(rate(http_requests_total{namespace="production"}[5m])) by (service)
            > 0.01
          for: 5m
          labels:
            severity: critical
            team: production
            namespace: production
          annotations:
            summary: "High error rate in production for {{ $labels.service }}"
            description: "Error rate is {{ $value | humanizePercentage }}."

        - alert: ProductionHighMemoryUsage
          expr: |
            sum(container_memory_working_set_bytes{namespace="production", container!=""}) by (pod)
            /
            sum(kube_pod_container_resource_limits{namespace="production", resource="memory"}) by (pod)
            > 0.85
          for: 10m
          labels:
            severity: warning
            team: production
            namespace: production
          annotations:
            summary: "High memory usage for pod {{ $labels.pod }} in production"
            description: "Memory usage is {{ $value | humanizePercentage }} of limit."
```

## Step 4: Create a Namespace Dashboard in Grafana

Build a Grafana dashboard focused on a specific namespace:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: production-namespace-dashboard
  namespace: cattle-dashboards
  labels:
    grafana_dashboard: "1"
data:
  production.json: |
    {
      "title": "Production Namespace Overview",
      "uid": "production-ns-overview",
      "templating": {
        "list": [{
          "name": "pod",
          "type": "query",
          "query": "label_values(kube_pod_info{namespace=\"production\"}, pod)",
          "datasource": "Prometheus"
        }]
      },
      "panels": [
        {
          "title": "Pod Count",
          "type": "stat",
          "gridPos": { "h": 4, "w": 6, "x": 0, "y": 0 },
          "targets": [{
            "expr": "count(kube_pod_info{namespace=\"production\"})"
          }]
        },
        {
          "title": "CPU Usage by Pod",
          "type": "timeseries",
          "gridPos": { "h": 8, "w": 12, "x": 0, "y": 4 },
          "targets": [{
            "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"production\", container!=\"\"}[5m])) by (pod)",
            "legendFormat": "{{ pod }}"
          }]
        },
        {
          "title": "Memory Usage by Pod",
          "type": "timeseries",
          "gridPos": { "h": 8, "w": 12, "x": 12, "y": 4 },
          "targets": [{
            "expr": "sum(container_memory_working_set_bytes{namespace=\"production\", container!=\"\"}) by (pod)",
            "legendFormat": "{{ pod }}"
          }],
          "fieldConfig": { "defaults": { "unit": "bytes" } }
        },
        {
          "title": "Pod Restarts",
          "type": "timeseries",
          "gridPos": { "h": 8, "w": 12, "x": 0, "y": 12 },
          "targets": [{
            "expr": "sum by (pod) (increase(kube_pod_container_status_restarts_total{namespace=\"production\"}[1h]))",
            "legendFormat": "{{ pod }}"
          }]
        }
      ]
    }
```

## Step 5: Use ResourceQuotas for Namespace Monitoring

Set up ResourceQuotas and monitor their usage:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "100"
```

Monitor quota usage with PromQL:

```promql
# CPU request quota usage percentage

kube_resourcequota{namespace="production", type="used", resource="requests.cpu"}
/ ignoring(type)
kube_resourcequota{namespace="production", type="hard", resource="requests.cpu"}
* 100

# Pod count quota usage
kube_resourcequota{namespace="production", type="used", resource="pods"}
/ ignoring(type)
kube_resourcequota{namespace="production", type="hard", resource="pods"}
* 100
```

Add quota alerts:

```yaml
- alert: NamespaceQuotaNearLimit
  expr: |
    kube_resourcequota{type="used"} / ignoring(type) kube_resourcequota{type="hard"} > 0.9
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Namespace {{ $labels.namespace }} quota for {{ $labels.resource }} is near limit"
    description: "Quota usage is {{ $value | humanizePercentage }}."
```

## Step 6: Route Namespace Alerts to Specific Teams

Configure Alertmanager to route namespace-specific alerts to the appropriate team:

```yaml
alertmanager:
  config:
    global:
      slack_api_url_file: /etc/alertmanager/secrets/slack/api-url
    route:
      receiver: "default"
      routes:
        - receiver: "production-team"
          matchers:
            - 'namespace="production"'
        - receiver: "staging-team"
          matchers:
            - 'namespace="staging"'
    receivers:
      - name: "default"
        slack_configs:
          - channel: "#general-alerts"
      - name: "production-team"
        slack_configs:
          - channel: "#production-alerts"
        pagerduty_configs:
          - service_key_file: /etc/alertmanager/secrets/pd-prod/key
      - name: "staging-team"
        slack_configs:
          - channel: "#staging-alerts"
```

## Step 7: Monitor Namespace Network Traffic

If you want namespace-level network visibility, monitor traffic for specific namespaces:

```promql
# Inbound traffic to namespace
sum(rate(container_network_receive_bytes_total{namespace="production"}[5m]))

# Outbound traffic from namespace
sum(rate(container_network_transmit_bytes_total{namespace="production"}[5m]))

# Network errors in namespace
sum(rate(container_network_receive_errors_total{namespace="production"}[5m]))
```

## Summary

Namespace-specific monitoring in Rancher involves creating scoped ServiceMonitors, namespace-targeted PrometheusRules, and dedicated Grafana dashboards. Use Kubernetes ResourceQuotas to set namespace boundaries and monitor their usage. Route namespace-specific alerts to the appropriate teams through Alertmanager routing rules. This approach gives teams visibility into their own workloads while reducing overall monitoring noise.

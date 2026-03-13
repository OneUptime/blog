# How to Create Grafana Dashboard for Flagger Canary Analysis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Grafana, Dashboard, Prometheus, Monitoring, Canary Deployments

Description: Learn how to create a Grafana dashboard for monitoring Flagger canary analysis with real-time traffic and metric visualizations.

---

## Introduction

Monitoring canary deployments in real time is essential for understanding how Flagger manages progressive delivery. A well-designed Grafana dashboard provides visibility into canary status, traffic distribution, success rates, latency, and the progression of the canary analysis. This helps your team observe deployments as they happen and quickly identify issues.

This guide walks you through creating a comprehensive Grafana dashboard for Flagger canary analysis. You will set up panels that display canary status, traffic weight distribution, request success rates, latency percentiles, and canary events.

## Prerequisites

Before you begin, ensure you have:

- Grafana installed and accessible in your cluster.
- Prometheus configured as a data source in Grafana.
- Flagger installed and running canary deployments.
- `kubectl` installed and configured.

## Setting Up the Grafana Data Source

If Prometheus is not already configured as a Grafana data source, add it through the Grafana configuration.

```yaml
# grafana-datasource.yaml
# Grafana data source configuration for Prometheus
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
  labels:
    grafana_datasource: "1"
data:
  prometheus.yaml: |
    apiVersion: 1
    datasources:
      - name: Prometheus
        type: prometheus
        access: proxy
        url: http://prometheus-server.monitoring:80
        isDefault: true
        editable: true
```

## Creating the Dashboard ConfigMap

You can provision the Grafana dashboard as a Kubernetes ConfigMap for automatic loading. The following defines a dashboard with essential panels for canary monitoring.

```yaml
# grafana-flagger-dashboard.yaml
# ConfigMap for Flagger canary analysis dashboard
apiVersion: v1
kind: ConfigMap
metadata:
  name: flagger-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  flagger-canary.json: |
    {
      "dashboard": {
        "title": "Flagger Canary Analysis",
        "uid": "flagger-canary",
        "timezone": "browser",
        "templating": {
          "list": [
            {
              "name": "namespace",
              "type": "query",
              "query": "label_values(flagger_canary_status, namespace)",
              "datasource": "Prometheus"
            },
            {
              "name": "canary",
              "type": "query",
              "query": "label_values(flagger_canary_status{namespace=\"$namespace\"}, name)",
              "datasource": "Prometheus"
            }
          ]
        }
      }
    }
```

## Key PromQL Queries for Dashboard Panels

The following PromQL queries power the essential dashboard panels.

### Canary Status Panel

Track the current status of the canary deployment.

```yaml
# PromQL query for canary status
# Returns 0 for initialized, 1 for progressing, 2 for promoting,
# 3 for finalizing, 4 for succeeded, 5 for failed
query: |
  flagger_canary_status{
    namespace="$namespace",
    name="$canary"
  }
```

### Canary Weight Panel

Visualize the current traffic weight assigned to the canary.

```yaml
# PromQL query for canary traffic weight
query: |
  flagger_canary_weight{
    namespace="$namespace",
    name="$canary"
  }
```

### Request Success Rate Panel

Monitor the request success rate for both primary and canary.

```yaml
# PromQL query for canary request success rate (Istio example)
query: |
  sum(rate(istio_requests_total{
    reporter="destination",
    destination_workload_namespace="$namespace",
    destination_workload=~"$canary-primary|$canary-canary",
    response_code!~"5.*"
  }[$__rate_interval]))
  by (destination_workload)
  /
  sum(rate(istio_requests_total{
    reporter="destination",
    destination_workload_namespace="$namespace",
    destination_workload=~"$canary-primary|$canary-canary"
  }[$__rate_interval]))
  by (destination_workload)
  * 100
```

### Request Duration Panel

Display latency percentiles for the primary and canary.

```yaml
# PromQL query for P99 request duration (Istio example)
query: |
  histogram_quantile(0.99, sum(rate(
    istio_request_duration_milliseconds_bucket{
      reporter="destination",
      destination_workload_namespace="$namespace",
      destination_workload=~"$canary-primary|$canary-canary"
    }[$__rate_interval]
  )) by (le, destination_workload))
```

### Request Volume Panel

Show the request rate for primary and canary to verify traffic is being split.

```yaml
# PromQL query for request volume
query: |
  sum(rate(istio_requests_total{
    reporter="destination",
    destination_workload_namespace="$namespace",
    destination_workload=~"$canary-primary|$canary-canary"
  }[$__rate_interval]))
  by (destination_workload)
```

## Creating Panels in Grafana

You can create the dashboard directly in the Grafana UI. Here is a recommended panel layout.

The first row should contain single-stat panels for canary status and canary weight. The canary status panel uses the `flagger_canary_status` metric with value mappings to display human-readable status names. The canary weight panel uses `flagger_canary_weight` and should show a gauge from 0 to 100.

The second row should contain time series graphs for request success rate and request duration. Set the success rate panel Y-axis to percentage (0-100) and add a threshold line at your configured minimum (such as 99 percent). Set the request duration panel Y-axis to milliseconds and add a threshold at your configured maximum.

The third row should contain a request volume graph and an annotations panel showing Flagger events. You can configure Grafana annotations from Prometheus using the `flagger_canary_status` changes.

## Deploying the Dashboard

Apply the ConfigMap to deploy the dashboard.

```bash
kubectl apply -f grafana-flagger-dashboard.yaml
```

If your Grafana is configured to watch for ConfigMaps with the `grafana_dashboard` label, the dashboard will be automatically loaded. Otherwise, import the JSON through the Grafana UI.

## Adding Alerting to the Dashboard

Configure Grafana alerts to notify you when canary deployments fail.

```yaml
# grafana-alert-rule.yaml
# Grafana alert rule for failed canary deployments
apiVersion: v1
kind: ConfigMap
metadata:
  name: flagger-alert-rules
  namespace: monitoring
data:
  flagger-alerts.yaml: |
    groups:
      - name: flagger
        rules:
          - alert: CanaryFailed
            expr: flagger_canary_status{status="failed"} == 1
            for: 1m
            labels:
              severity: warning
            annotations:
              summary: "Canary {{ $labels.name }} failed in {{ $labels.namespace }}"
```

## Conclusion

A Grafana dashboard for Flagger canary analysis gives your team real-time visibility into progressive deployments. By visualizing canary status, traffic weights, success rates, and latency metrics, you can observe how Flagger manages the rollout and quickly identify any issues. Combined with alerting, this dashboard becomes a critical tool for maintaining confidence in your deployment pipeline.

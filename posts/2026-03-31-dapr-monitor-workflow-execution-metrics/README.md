# How to Monitor Workflow Execution Metrics in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Monitoring, Prometheus, Observability

Description: Monitor Dapr workflow execution metrics using Prometheus and Grafana to track workflow throughput, activity durations, and failure rates.

---

## Overview

Dapr exposes workflow execution metrics via Prometheus that cover workflow scheduling, completion, failure rates, and activity durations. Monitoring these metrics is essential for understanding SLA compliance and detecting issues in production.

## Enabling Metrics in Dapr

Ensure metrics are enabled in the Dapr configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprconfig
  namespace: default
spec:
  metrics:
    enabled: true
```

Deploy Dapr with metrics:

```bash
helm upgrade dapr dapr/dapr \
  --set dapr_operator.logLevel=info \
  --set global.prometheus.enabled=true
```

## Key Workflow Metrics

```bash
# Workflow scheduling latency
dapr_runtime_workflow_scheduling_latency

# Workflow execution duration
dapr_runtime_workflow_execution_latency_bucket

# Activity execution count and latency
dapr_runtime_workflow_activity_execution_latency_bucket
dapr_runtime_workflow_activity_execution_count

# Workflow execution count by status
dapr_runtime_workflow_execution_count{status="success"}
dapr_runtime_workflow_execution_count{status="failed"}
```

## Prometheus Scrape Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'dapr-sidecar'
    kubernetes_sd_configs:
    - role: pod
    relabel_configs:
    - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_enabled]
      action: keep
      regex: "true"
    - source_labels: [__meta_kubernetes_pod_ip]
      target_label: __address__
      replacement: "${1}:9090"
```

## Useful PromQL Queries

```bash
# Workflow throughput (completions per minute)
rate(dapr_runtime_workflow_execution_count{status="success"}[1m]) * 60

# Workflow failure rate
rate(dapr_runtime_workflow_execution_count{status="failed"}[5m]) /
  rate(dapr_runtime_workflow_execution_count[5m])

# P95 workflow execution latency
histogram_quantile(0.95,
  rate(dapr_runtime_workflow_execution_latency_bucket[5m]))

# Slowest activities by P99 latency
histogram_quantile(0.99,
  sum by (activity_name, le)(
    rate(dapr_runtime_workflow_activity_execution_latency_bucket[5m])
  ))

# Active (running) workflow count
dapr_runtime_workflow_operation_count{operation="create_workflow"} - dapr_runtime_workflow_execution_count
```

## Grafana Dashboard Configuration

```json
{
  "title": "Dapr Workflow Health",
  "panels": [
    {
      "title": "Workflow Completions/min",
      "type": "stat",
      "targets": [{
        "expr": "sum(rate(dapr_runtime_workflow_execution_count{status='success'}[1m])) * 60"
      }]
    },
    {
      "title": "Failure Rate %",
      "type": "gauge",
      "targets": [{
        "expr": "100 * sum(rate(dapr_runtime_workflow_execution_count{status='failed'}[5m])) / sum(rate(dapr_runtime_workflow_execution_count[5m]))"
      }]
    },
    {
      "title": "P95 Workflow Latency (ms)",
      "type": "graph",
      "targets": [{
        "expr": "histogram_quantile(0.95, rate(dapr_runtime_workflow_execution_latency_bucket[5m]))"
      }]
    }
  ]
}
```

## Alerting Rules

```yaml
groups:
- name: dapr-workflow
  rules:
  - alert: HighWorkflowFailureRate
    expr: |
      rate(dapr_runtime_workflow_execution_count{status="failed"}[5m]) /
      rate(dapr_runtime_workflow_execution_count[5m]) > 0.05
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Workflow failure rate above 5%"

  - alert: WorkflowLatencyHigh
    expr: |
      histogram_quantile(0.95,
        rate(dapr_runtime_workflow_execution_latency_bucket[5m])) > 30000
    for: 10m
    labels:
      severity: critical
    annotations:
      summary: "P95 workflow latency exceeds 30 seconds"
```

## Summary

Dapr exposes workflow metrics via the Prometheus endpoint on port 9090. Key metrics include completion rates by status, execution latency histograms, and per-activity latency. Set up Grafana dashboards for throughput and latency visualization, and configure alerts for failure rate thresholds and latency SLA violations to catch workflow health issues before they affect end users.

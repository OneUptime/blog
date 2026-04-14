# How to Monitor Retry Rates in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Retry, Monitoring, Metric, Resiliency

Description: Learn how to monitor retry rates in Dapr using built-in metrics, Prometheus scraping, and Grafana dashboards to detect resiliency issues early.

---

## Overview

Dapr automatically retries failed service invocations and component operations based on your resiliency policies. Monitoring retry rates gives you visibility into transient failure patterns and helps you tune retry configurations before they impact users.

Dapr exposes retry-related metrics via its Prometheus-compatible `/metrics` endpoint on port 9090 of the Dapr sidecar.

## Key Dapr Retry Metrics

Dapr surfaces several metrics relevant to retries:

| Metric | Description |
|--------|-------------|
| `dapr_resiliency_count` | Total resiliency policy executions |
| `dapr_resiliency_activations_total` | Number of times a policy was activated |
| `dapr_runtime_service_invocation_req_sent_total` | Total outbound service invocation requests |

Filter by labels such as `policy`, `name`, `namespace`, and `appId` to isolate retry activity.

## Configuring Prometheus to Scrape Dapr Metrics

Add a Prometheus scrape config targeting Dapr sidecar metrics:

```yaml
scrape_configs:
  - job_name: dapr-sidecar
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_enabled]
        action: keep
        regex: "true"
      - source_labels: [__meta_kubernetes_pod_ip]
        target_label: __address__
        replacement: "${1}:9090"
    metrics_path: /metrics
```

## Querying Retry Rates in Prometheus

Use PromQL to calculate retry rates over time:

```bash
# Rate of resiliency policy activations per second over 5 minutes
rate(dapr_resiliency_activations_total[5m])

# Retry rate for a specific app filtered by retry policy
rate(dapr_resiliency_activations_total{appId="order-service", policy="retry"}[5m])

# Ratio of retried requests vs total requests
rate(dapr_resiliency_activations_total[5m]) /
  rate(dapr_runtime_service_invocation_req_sent_total[5m])
```

## Creating a Grafana Alert for High Retry Rates

Define a Grafana alert rule that fires when the retry rate exceeds a threshold:

```yaml
apiVersion: 1
groups:
  - name: dapr-resiliency
    rules:
      - alert: HighDaprRetryRate
        expr: |
          rate(dapr_resiliency_activations_total[5m]) > 0.1
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High Dapr retry rate detected"
          description: "Retry rate for {{ $labels.appId }} exceeds 0.1/s for 2 minutes."
```

## Enabling Metrics on a Dapr Sidecar

Ensure metrics are enabled via the Dapr configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprconfig
spec:
  metrics:
    enabled: true
```

Apply to your pod with the annotation:

```yaml
annotations:
  dapr.io/config: "daprconfig"
  dapr.io/enable-metrics: "true"
  dapr.io/metrics-port: "9090"
```

## Interpreting Retry Rate Trends

A low, steady retry rate often indicates normal transient failures being handled correctly. Spikes signal:
- Downstream service degradation
- Network instability
- Misconfigured retry policies with too-aggressive thresholds

Use the Grafana dashboard to correlate retry rate spikes with error rate increases and latency changes to diagnose root causes quickly.

## Summary

Monitoring Dapr retry rates requires enabling the metrics endpoint, scraping with Prometheus, and building PromQL queries that surface resiliency policy activations. Setting Grafana alerts on retry rate thresholds allows your team to detect and respond to degraded dependencies before they cascade into user-facing outages.

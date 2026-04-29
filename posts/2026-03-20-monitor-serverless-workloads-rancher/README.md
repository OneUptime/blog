# How to Monitor Serverless Workloads in Rancher - Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Serverless Monitoring, Prometheus, OpenFaaS, Knative, Observability

Description: Monitor serverless workloads in Rancher with function invocation metrics, cold start tracking, error rates, and autoscaling behavior visualization.

## Introduction

Serverless monitoring differs from traditional application monitoring because of ephemeral pods, scale-to-zero behavior, and cold starts. Standard pod metrics disappear when scaled to zero, so function-level metrics must be tracked at the framework level.

## Key Serverless Metrics

| Metric | What it Measures | Alert Threshold |
|---|---|---|
| Invocation rate | Functions calls per second | Trending baseline |
| Error rate | Failed invocations / total | > 1% |
| Cold start rate | Invocations starting new pods | > 10% |
| Latency p99 | 99th percentile response time | > SLA |
| Concurrent replicas | Active function pods | At maxScale |
| Scale-to-zero events | How often functions are idle | Depends on workload |

## Step 1: Enable OpenFaaS Prometheus Metrics

```yaml
# OpenFaaS values (already enabled by default)

gateway:
  prometheusPort: 8082
  prometheusHost: "0.0.0.0"

# ServiceMonitor for Prometheus Operator
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: openfaas-gateway
  namespace: openfaas
spec:
  selector:
    matchLabels:
      app: gateway
  endpoints:
    - port: metrics
      path: /metrics
      interval: 15s
```

## Step 2: Key OpenFaaS Prometheus Queries

```promql
# Invocation rate per function
sum by (function_name) (
  rate(gateway_function_invocation_total[5m])
)

# Error rate per function
sum by (function_name) (
  rate(gateway_function_invocation_total{code!="200"}[5m])
)
/
sum by (function_name) (
  rate(gateway_function_invocation_total[5m])
) * 100

# Average function duration
sum by (function_name) (
  rate(gateway_functions_seconds_sum[5m])
)
/
sum by (function_name) (
  rate(gateway_functions_seconds_count[5m])
)
```

## Step 3: Monitor Knative Autoscaling

```promql
# Current desired replicas for Knative services
desired_pods

# Observed concurrency vs target
stable_request_concurrency
/
target_concurrency_per_pod

# Scale-from-zero events
increase(not_ready_pods[5m]) > 0
```

## Step 4: Monitor KEDA ScaledObjects

```promql
# Current replicas managed by KEDA
keda_scaler_active{namespace="production"}

# KEDA scaling events
increase(keda_scaler_detail_errors_total[5m]) > 0
```

## Step 5: Alert on Serverless Anomalies

```yaml
# serverless-alerts.yaml
groups:
  - name: serverless
    rules:
      - alert: HighFunctionErrorRate
        expr: |
          sum by (function_name) (
            rate(gateway_function_invocation_total{code!~"2.."}[5m])
          ) / sum by (function_name) (
            rate(gateway_function_invocation_total[5m])
          ) > 0.05
        for: 5m
        labels:
          severity: warning

      - alert: FunctionAtMaxScale
        expr: |
          kube_horizontalpodautoscaler_status_current_replicas{namespace="openfaas-fn"}
          >= kube_horizontalpodautoscaler_spec_max_replicas{namespace="openfaas-fn"}
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Function {{ $labels.horizontalpodautoscaler }} is at max replicas"
```

## Conclusion

Serverless monitoring in Rancher requires tracking metrics at the function framework level (invocations, errors, latency) rather than just the pod level. Function-level dashboards should show invocation rates, error rates, cold start frequency, and current replica counts to give operators a complete picture of serverless workload behavior.

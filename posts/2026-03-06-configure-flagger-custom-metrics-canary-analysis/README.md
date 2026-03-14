# How to Configure Flagger with Custom Metrics for Canary Analysis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Flagger, Custom-metrics, Canary, Prometheus, Kubernetes, GitOps, Observability

Description: A detailed guide to creating and using custom metrics for Flagger canary analysis with Prometheus in Flux-managed Kubernetes clusters.

---

## Introduction

While Flagger provides built-in metrics for request success rate and request duration, real-world applications often require custom metrics for canary analysis. Business metrics like conversion rates, custom latency percentiles, queue depths, and error classifications can provide much more meaningful signals about the health of a new deployment.

This guide shows you how to define custom Prometheus metrics and use them in Flagger canary analysis within a Flux-managed Kubernetes environment.

## Prerequisites

- A Kubernetes cluster with Flux and Flagger installed
- Prometheus deployed and scraping your application metrics
- An application that exposes custom Prometheus metrics
- kubectl and flux CLI tools

## Step 1: Instrument Your Application with Custom Metrics

Your application needs to expose Prometheus metrics. Here is an example of common metrics you might want to track.

```yaml
# Example application deployment with Prometheus annotations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
      annotations:
        # Prometheus scrape annotations
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: my-app
          image: my-app:1.0.0
          ports:
            - containerPort: 8080
```

Example metrics your application might expose:

```json
# Application-specific latency histogram
http_request_duration_seconds_bucket{method="GET",path="/api/v1/items",le="0.1"} 2400
http_request_duration_seconds_bucket{method="GET",path="/api/v1/items",le="0.5"} 2900
http_request_duration_seconds_bucket{method="GET",path="/api/v1/items",le="1.0"} 2980
http_request_duration_seconds_bucket{method="GET",path="/api/v1/items",le="+Inf"} 3000

# Business metric: checkout conversion rate
checkout_conversion_total{result="success"} 1500
checkout_conversion_total{result="failure"} 50

# Custom error counter by type
app_errors_total{type="validation"} 120
app_errors_total{type="timeout"} 15
app_errors_total{type="internal"} 3

# Queue depth gauge
message_queue_depth{queue="orders"} 42
```

## Step 2: Create a Custom Latency Percentile Metric

Define a MetricTemplate that queries the 99th percentile latency from Prometheus.

```yaml
# custom-p99-latency.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: custom-p99-latency
  namespace: default
spec:
  provider:
    type: prometheus
    # Address of your Prometheus instance
    address: http://prometheus.monitoring.svc.cluster.local:9090
  # PromQL query for 99th percentile latency
  # {{ target }} is replaced with the canary target name
  # {{ namespace }} is replaced with the canary namespace
  query: |
    histogram_quantile(
      0.99,
      sum(
        rate(
          http_request_duration_seconds_bucket{
            app="{{ target }}",
            namespace="{{ namespace }}"
          }[1m]
        )
      ) by (le)
    )
```

## Step 3: Create a Custom Error Rate by Type Metric

Track specific error types rather than just overall error rates.

```yaml
# custom-timeout-error-rate.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: custom-timeout-error-rate
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring.svc.cluster.local:9090
  # Calculate timeout error rate as a percentage
  query: |
    sum(
      rate(
        app_errors_total{
          type="timeout",
          app="{{ target }}",
          namespace="{{ namespace }}"
        }[1m]
      )
    )
    /
    sum(
      rate(
        http_requests_total{
          app="{{ target }}",
          namespace="{{ namespace }}"
        }[1m]
      )
    ) * 100
```

## Step 4: Create a Business Metric Template

Use business-level metrics for canary analysis to catch regressions that technical metrics might miss.

```yaml
# custom-conversion-rate.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: custom-conversion-rate
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring.svc.cluster.local:9090
  # Calculate checkout conversion rate
  query: |
    sum(
      rate(
        checkout_conversion_total{
          result="success",
          app="{{ target }}",
          namespace="{{ namespace }}"
        }[5m]
      )
    )
    /
    sum(
      rate(
        checkout_conversion_total{
          app="{{ target }}",
          namespace="{{ namespace }}"
        }[5m]
      )
    ) * 100
```

## Step 5: Create a Queue Depth Metric Template

Monitor queue depth to ensure the canary is not causing message backlogs.

```yaml
# custom-queue-depth.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: custom-queue-depth
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring.svc.cluster.local:9090
  # Query current queue depth
  query: |
    max(
      message_queue_depth{
        queue="orders",
        app="{{ target }}",
        namespace="{{ namespace }}"
      }
    )
```

## Step 6: Create a Canary-to-Primary Comparison Metric

Compare the canary performance against the primary to detect regressions relative to baseline.

```yaml
# custom-latency-comparison.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: custom-latency-ratio
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring.svc.cluster.local:9090
  # Calculate the ratio of canary latency to primary latency
  # A value of 1.0 means equal performance
  # A value above 1.0 means canary is slower
  query: |
    (
      histogram_quantile(
        0.99,
        sum(
          rate(
            http_request_duration_seconds_bucket{
              app="{{ target }}-canary",
              namespace="{{ namespace }}"
            }[2m]
          )
        ) by (le)
      )
    )
    /
    (
      histogram_quantile(
        0.99,
        sum(
          rate(
            http_request_duration_seconds_bucket{
              app="{{ target }}-primary",
              namespace="{{ namespace }}"
            }[2m]
          )
        ) by (le)
      )
    )
```

## Step 7: Create a Custom Saturation Metric

Monitor resource saturation to catch memory leaks or CPU spikes in the canary.

```yaml
# custom-cpu-saturation.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: custom-cpu-usage
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring.svc.cluster.local:9090
  # Calculate average CPU usage percentage for canary pods
  query: |
    avg(
      rate(
        container_cpu_usage_seconds_total{
          container="{{ target }}",
          namespace="{{ namespace }}"
        }[2m]
      )
    ) * 100
```

## Step 8: Wire All Custom Metrics into the Canary Resource

Combine all custom metrics in a single Canary resource for comprehensive analysis.

```yaml
# canary-with-custom-metrics.yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
  analysis:
    # Run analysis every minute
    interval: 1m
    # Roll back after 5 failed checks
    threshold: 5
    # Maximum canary traffic
    maxWeight: 50
    # Traffic increment
    stepWeight: 10
    metrics:
      # Built-in request success rate
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      # Custom P99 latency - fail if above 500ms
      - name: p99-latency
        templateRef:
          name: custom-p99-latency
        thresholdRange:
          max: 0.5
        interval: 1m
      # Custom timeout error rate - fail if above 0.5%
      - name: timeout-error-rate
        templateRef:
          name: custom-timeout-error-rate
        thresholdRange:
          max: 0.5
        interval: 1m
      # Custom conversion rate - fail if below 5%
      - name: conversion-rate
        templateRef:
          name: custom-conversion-rate
        thresholdRange:
          min: 5
        interval: 5m
      # Queue depth - fail if above 100
      - name: queue-depth
        templateRef:
          name: custom-queue-depth
        thresholdRange:
          max: 100
        interval: 1m
      # Latency ratio - fail if canary is 50% slower than primary
      - name: latency-ratio
        templateRef:
          name: custom-latency-ratio
        thresholdRange:
          max: 1.5
        interval: 2m
      # CPU usage - fail if above 80%
      - name: cpu-usage
        templateRef:
          name: custom-cpu-usage
        thresholdRange:
          max: 80
        interval: 1m
    webhooks:
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.flagger-system.svc.cluster.local/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default.svc.cluster.local:80/"
```

## Step 9: Validate Custom Metrics with Prometheus

Before using custom metrics in Flagger, validate them in Prometheus to ensure they return data.

```bash
# Port-forward Prometheus for local access
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &

# Test the P99 latency query
curl -s "http://localhost:9090/api/v1/query" \
  --data-urlencode 'query=histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{app="my-app"}[1m])) by (le))' \
  | jq '.data.result'

# Test the conversion rate query
curl -s "http://localhost:9090/api/v1/query" \
  --data-urlencode 'query=sum(rate(checkout_conversion_total{result="success",app="my-app"}[5m])) / sum(rate(checkout_conversion_total{app="my-app"}[5m])) * 100' \
  | jq '.data.result'
```

## Step 10: Deploy and Monitor

Apply all resources and trigger a canary deployment.

```bash
# Apply metric templates
kubectl apply -f custom-p99-latency.yaml
kubectl apply -f custom-timeout-error-rate.yaml
kubectl apply -f custom-conversion-rate.yaml
kubectl apply -f custom-queue-depth.yaml
kubectl apply -f custom-latency-comparison.yaml
kubectl apply -f custom-cpu-saturation.yaml

# Apply the canary
kubectl apply -f canary-with-custom-metrics.yaml

# Trigger a deployment
kubectl set image deployment/my-app my-app=my-app:2.0.0 -n default

# Watch the canary with all custom metrics
kubectl get canary my-app -n default -w

# View detailed metric analysis in Flagger logs
kubectl logs -n flagger-system deployment/flagger -f | grep "my-app"
```

## Troubleshooting

Common issues with custom metrics:

- **No data returned**: Ensure the label selectors match your application's Prometheus labels exactly
- **NaN result**: The query may be dividing by zero; add a check for zero-value denominators
- **Metric always failing**: Lower the threshold or check if the query returns values in the expected unit
- **Wrong target name**: Verify that `{{ target }}` resolves to the correct deployment name

```bash
# Check what Flagger resolves as the target
kubectl describe canary my-app -n default | grep -i target

# View metric check results in events
kubectl get events -n default --field-selector involvedObject.name=my-app --sort-by='.lastTimestamp'
```

## Conclusion

Custom metrics are essential for effective canary analysis. By combining technical metrics like latency percentiles and error rates with business metrics like conversion rates, you get a comprehensive view of how a new deployment affects your application. Flagger's MetricTemplate system provides the flexibility to query any metric from Prometheus and use it for automated promotion decisions. When managed through Flux GitOps, these metric definitions are version-controlled and auditable, ensuring consistent canary analysis across your deployment pipeline.

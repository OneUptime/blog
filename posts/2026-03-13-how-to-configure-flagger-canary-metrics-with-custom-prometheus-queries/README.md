# How to Configure Flagger Canary Metrics with Custom Prometheus Queries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Canary, Prometheus, Metrics, Custom Queries, Kubernetes

Description: Learn how to define custom Prometheus queries as Flagger MetricTemplates to evaluate canary health with application-specific metrics.

---

## Introduction

Flagger includes built-in metrics like request success rate and request duration, but real-world applications often need custom metrics for meaningful canary analysis. A payment service might need to track transaction failure rates, a search service might need to monitor query latency at specific percentiles, and a data pipeline might need to track throughput.

Flagger's MetricTemplate custom resource lets you define arbitrary Prometheus queries and use them in your canary analysis. This guide shows you how to create MetricTemplates and reference them in your Canary resources.

## Prerequisites

- A running Kubernetes cluster with Flagger installed
- Prometheus deployed and scraping your application metrics
- kubectl access to your cluster
- A Canary resource configured for a Deployment

## Understanding MetricTemplates

A MetricTemplate defines a Prometheus query that Flagger evaluates during canary analysis. The template supports Go template variables that Flagger populates at runtime:

- `{{ target }}` - the canary Deployment name (e.g., `podinfo`)
- `{{ namespace }}` - the canary namespace
- `{{ interval }}` - the metric check interval
- `{{ variables.key }}` - custom variables passed from the Canary spec

## Creating a Basic MetricTemplate

Here is a MetricTemplate that queries the error rate of an application:

```yaml
# metric-template.yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-rate
  namespace: demo
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    100 - (
      sum(
        rate(
          http_requests_total{
            namespace="{{ namespace }}",
            pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)",
            status!~"5.*"
          }[{{ interval }}]
        )
      )
      /
      sum(
        rate(
          http_requests_total{
            namespace="{{ namespace }}",
            pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
          }[{{ interval }}]
        )
      )
      * 100
    )
```

Apply the MetricTemplate:

```bash
kubectl apply -f metric-template.yaml
```

## Referencing MetricTemplates in Canary Analysis

Reference the MetricTemplate in your Canary's `analysis.metrics` section using `templateRef`:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: demo
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  service:
    port: 9898
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      # Built-in metric
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      # Custom metric referencing a MetricTemplate
      - name: error-rate
        templateRef:
          name: error-rate
          namespace: demo
        thresholdRange:
          max: 1
        interval: 1m
```

The `thresholdRange` defines acceptable values:
- `min`: the metric value must be greater than or equal to this
- `max`: the metric value must be less than or equal to this

## Practical MetricTemplate Examples

### Response Latency P95

Monitor the 95th percentile response latency:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: response-latency-p95
  namespace: demo
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    histogram_quantile(0.95,
      sum(
        rate(
          http_request_duration_seconds_bucket{
            namespace="{{ namespace }}",
            pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
          }[{{ interval }}]
        )
      ) by (le)
    ) * 1000
```

Use in Canary (value in milliseconds):

```yaml
metrics:
  - name: response-latency-p95
    templateRef:
      name: response-latency-p95
    thresholdRange:
      max: 500
    interval: 1m
```

### CPU Usage

Ensure the canary does not use excessive CPU:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: cpu-usage
  namespace: demo
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    avg(
      rate(
        container_cpu_usage_seconds_total{
          namespace="{{ namespace }}",
          pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
        }[{{ interval }}]
      )
    ) * 100
```

Use in Canary:

```yaml
metrics:
  - name: cpu-usage
    templateRef:
      name: cpu-usage
    thresholdRange:
      max: 80
    interval: 1m
```

### Custom Business Metric

Track a business-specific metric like order conversion rate:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: order-conversion-rate
  namespace: demo
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    sum(
      rate(
        orders_completed_total{
          namespace="{{ namespace }}",
          pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
        }[{{ interval }}]
      )
    )
    /
    sum(
      rate(
        orders_started_total{
          namespace="{{ namespace }}",
          pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"
        }[{{ interval }}]
      )
    ) * 100
```

### Using Template Variables

You can pass custom variables from the Canary to the MetricTemplate:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-rate-by-service
  namespace: demo
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    sum(
      rate(
        http_requests_total{
          namespace="{{ namespace }}",
          pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)",
          status=~"5.*",
          service="{{ variables.serviceName }}"
        }[{{ interval }}]
      )
    )
```

Reference with variables in the Canary:

```yaml
metrics:
  - name: error-rate-by-service
    templateRef:
      name: error-rate-by-service
    templateVariables:
      serviceName: checkout-api
    thresholdRange:
      max: 1
    interval: 1m
```

## Cross-Namespace MetricTemplates

MetricTemplates can be shared across namespaces. Create the template in a common namespace and reference it with the namespace field:

```yaml
# Create in a shared namespace
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: standard-error-rate
  namespace: flagger-metrics
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    sum(rate(http_requests_total{namespace="{{ namespace }}", pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)", status=~"5.*"}[{{ interval }}]))
    /
    sum(rate(http_requests_total{namespace="{{ namespace }}", pod=~"{{ target }}-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)"}[{{ interval }}])) * 100
```

Reference from any namespace:

```yaml
metrics:
  - name: error-rate
    templateRef:
      name: standard-error-rate
      namespace: flagger-metrics
    thresholdRange:
      max: 1
    interval: 1m
```

## Debugging MetricTemplates

If your custom metrics are not working as expected, verify the query directly against Prometheus:

```bash
# Port-forward to Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Test the query manually (replace template variables with actual values)
curl -s 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=sum(rate(http_requests_total{namespace="demo",pod=~"podinfo-[0-9a-zA-Z]+(-[0-9a-zA-Z]+)",status=~"5.*"}[1m]))' | jq .
```

Check Flagger logs for metric evaluation errors:

```bash
kubectl logs -n flagger-system deploy/flagger | grep "metric"
```

## Conclusion

Custom Prometheus MetricTemplates extend Flagger's analysis capabilities beyond built-in metrics. By defining application-specific queries, you can evaluate canary health based on business metrics, resource usage, or any other Prometheus metric. Use template variables for reusable queries across services, and share MetricTemplates across namespaces for organizational consistency. Always test your queries directly against Prometheus before using them in production canary analysis.

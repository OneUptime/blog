# How to Configure Flagger Canary Metrics with Custom Error Rate

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Canary, Metrics, Error Rate, Prometheus, Kubernetes, Progressive Delivery, Custom Metrics

Description: Learn how to define and use a custom error rate metric in Flagger canary analysis with MetricTemplate resources and Prometheus queries.

---

## Introduction

Flagger ships with a built-in `request-success-rate` metric that works out of the box with supported service meshes. However, there are scenarios where the built-in metric does not fit your needs. You might want to count only specific HTTP status codes as errors, exclude certain endpoints from the calculation, or use application-level error metrics instead of mesh-level ones.

Custom error rate metrics give you full control over what constitutes a failure during canary analysis. By defining a MetricTemplate resource with a Prometheus query tailored to your application, you can ensure Flagger evaluates exactly the error conditions that matter to your service.

This guide covers how to create custom error rate MetricTemplates and wire them into your Canary analysis configuration.

## Prerequisites

- A running Kubernetes cluster with Flagger installed
- Prometheus deployed and scraping your application or mesh metrics
- kubectl access to your cluster
- A Deployment with a matching Service targeted by a Canary resource

## How Flagger Evaluates Error Rate Metrics

Flagger treats error rate metrics as a numeric value returned from a query. You define a threshold range, and Flagger compares the query result against it. For error rate, you typically want the result to stay below a maximum value (e.g., the error percentage must be less than 1%). Alternatively, if your query returns a success rate, you set a minimum threshold.

The MetricTemplate resource holds the query and provider configuration. The Canary resource references it and defines the threshold.

## Defining a Custom Error Rate MetricTemplate

Here is a MetricTemplate that calculates the percentage of 5xx responses for a workload using Istio metrics in Prometheus:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: error-rate
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    100 - (
      sum(rate(
        istio_requests_total{
          reporter="destination",
          destination_workload_namespace="{{ namespace }}",
          destination_workload="{{ target }}",
          response_code!~"5.*"
        }[{{ interval }}]
      ))
      /
      sum(rate(
        istio_requests_total{
          reporter="destination",
          destination_workload_namespace="{{ namespace }}",
          destination_workload="{{ target }}"
        }[{{ interval }}]
      ))
      * 100
    )
```

This query returns the error rate as a percentage. A result of 0 means no errors. A result of 5 means 5% of requests returned 5xx responses. The template variables `{{ namespace }}`, `{{ target }}`, and `{{ interval }}` are populated by Flagger automatically.

## Referencing the Custom Error Rate in a Canary

With the MetricTemplate created, add it to the Canary resource analysis:

```yaml
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
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: error-rate
        templateRef:
          name: error-rate
          namespace: default
        thresholdRange:
          max: 1
        interval: 1m
```

The `thresholdRange.max` of 1 means the canary fails the check if more than 1% of requests return 5xx errors. Flagger increments its failure counter each time this threshold is breached. After 5 consecutive failures (the `threshold` value), the canary rolls back.

## Counting Only Specific Error Codes

You may want to treat 400-level errors differently from 500-level errors. For example, if your API returns 404 for legitimate reasons, you might only want to count 500, 502, 503, and 504 as real errors:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: server-error-rate
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    100 * (
      sum(rate(
        istio_requests_total{
          reporter="destination",
          destination_workload_namespace="{{ namespace }}",
          destination_workload="{{ target }}",
          response_code=~"500|502|503|504"
        }[{{ interval }}]
      ))
      /
      sum(rate(
        istio_requests_total{
          reporter="destination",
          destination_workload_namespace="{{ namespace }}",
          destination_workload="{{ target }}"
        }[{{ interval }}]
      ))
    )
```

This gives you precise control over which HTTP status codes count as errors in your canary analysis.

## Using Application-Level Error Metrics

If your application exports its own error metrics (not mesh-level), you can query those instead. For example, if your app exposes a `http_requests_total` counter with a `status` label:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: app-error-rate
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus.monitoring:9090
  query: |
    100 * (
      sum(rate(
        http_requests_total{
          namespace="{{ namespace }}",
          deployment="{{ target }}",
          status=~"5.*"
        }[{{ interval }}]
      ))
      /
      sum(rate(
        http_requests_total{
          namespace="{{ namespace }}",
          deployment="{{ target }}"
        }[{{ interval }}]
      ))
    )
```

The label names must match what your application actually exports. Adjust `namespace`, `deployment`, and `status` to match your metric labels.

## Combining Multiple Error Rate Metrics

You can include multiple custom metrics in a single Canary analysis. All metrics must pass for the canary to advance:

```yaml
    metrics:
      - name: server-error-rate
        templateRef:
          name: server-error-rate
          namespace: default
        thresholdRange:
          max: 1
        interval: 1m
      - name: app-error-rate
        templateRef:
          name: app-error-rate
          namespace: default
        thresholdRange:
          max: 0.5
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
```

This configuration checks both mesh-level and application-level error rates alongside request duration. The canary must satisfy all three conditions at each analysis tick.

## Handling No-Traffic Scenarios

A common pitfall with custom error rate queries is division by zero when there is no traffic. If the denominator in your rate query is zero, Prometheus returns `NaN`, and Flagger treats `NaN` as a failed check. To handle this, you can use the Prometheus `or` operator to return a default value:

```yaml
  query: |
    100 * (
      sum(rate(
        istio_requests_total{
          reporter="destination",
          destination_workload_namespace="{{ namespace }}",
          destination_workload="{{ target }}",
          response_code=~"5.*"
        }[{{ interval }}]
      ))
      /
      sum(rate(
        istio_requests_total{
          reporter="destination",
          destination_workload_namespace="{{ namespace }}",
          destination_workload="{{ target }}"
        }[{{ interval }}]
      ))
    ) or vector(0)
```

The `or vector(0)` clause ensures that when there is no traffic, the query returns 0 instead of `NaN`, allowing the canary analysis to pass.

## Conclusion

Custom error rate metrics in Flagger give you precise control over what counts as a failure during canary analysis. By defining MetricTemplate resources with targeted Prometheus queries, you can filter by specific status codes, use application-level metrics instead of mesh-level ones, and combine multiple error conditions. The key is ensuring your query returns a numeric value that Flagger can compare against your configured threshold, and handling edge cases like no-traffic scenarios to avoid false rollbacks.

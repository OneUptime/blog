# How to Configure Flagger Canary Metrics with Request Duration P99

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Canary, Metrics, Request Duration, P99, Latency, Prometheus, Kubernetes, Progressive Delivery

Description: Learn how to configure a Flagger Canary resource to use request duration P99 as a metric for canary analysis, ensuring latency regressions trigger automatic rollbacks.

---

## Introduction

When running canary deployments with Flagger, success rate alone does not paint a complete picture. A new version might return correct responses but take significantly longer to process each request. If your service level objectives include latency targets, you need to track request duration percentiles during canary analysis.

The P99 (99th percentile) request duration is one of the most common latency metrics used for canary evaluation. It captures the worst-case experience for the vast majority of users, filtering out only the most extreme outliers. Flagger supports built-in metric templates for request duration that work with Prometheus-based metrics providers, as well as custom metric templates for other providers.

This guide walks through configuring a Flagger Canary resource to evaluate P99 request duration during progressive delivery, including both built-in and custom metric template approaches.

## Prerequisites

- A running Kubernetes cluster with Flagger installed
- A service mesh or ingress controller that exports request duration metrics (Istio, Linkerd, NGINX, etc.)
- Prometheus configured to scrape your mesh or ingress metrics
- kubectl access to your cluster
- A Deployment with a matching Service and (if using a mesh) the appropriate sidecar injected

## Understanding Request Duration Metrics in Flagger

Flagger evaluates canary health by querying a metrics provider at each analysis interval. For request duration, Flagger compares the observed latency against a maximum threshold you define. If the observed P99 latency exceeds the threshold, the check fails. Enough consecutive failures trigger a rollback.

The built-in request-duration metric template works with Istio, Linkerd, App Mesh, and other supported providers. For providers without built-in support, or when you need a custom query, you create a MetricTemplate resource.

## Using the Built-in Request Duration Metric

If you are using a supported service mesh like Istio or Linkerd, Flagger provides a built-in request-duration metric. You reference it by name in the analysis section of your Canary resource:

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
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
```

In this configuration, `request-duration` is a built-in metric name recognized by Flagger when used with supported providers. The `thresholdRange.max` value of 500 means that if the P99 request duration exceeds 500 milliseconds, the metric check fails. The `interval` on the metric controls the query time range.

## Creating a Custom MetricTemplate for P99 Duration

When you need more control over the query, or when using a provider that does not have built-in request duration support, you define a MetricTemplate. Here is an example using Prometheus with Istio metrics:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: request-duration-p99
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus.istio-system:9090
  query: |
    histogram_quantile(0.99,
      sum(rate(
        istio_request_duration_milliseconds_bucket{
          reporter="destination",
          destination_workload_namespace="{{ namespace }}",
          destination_workload="{{ target }}"
        }[{{ interval }}]
      )) by (le)
    )
```

The template variables `{{ namespace }}`, `{{ target }}`, and `{{ interval }}` are automatically populated by Flagger at query time. `{{ target }}` resolves to the canary workload name (with the `-canary` suffix appended by Flagger), `{{ namespace }}` resolves to the Canary resource namespace, and `{{ interval }}` resolves to the metric interval you specify.

## Referencing the Custom MetricTemplate in a Canary

Once the MetricTemplate is created, reference it in the Canary analysis section using `templateRef`:

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
      - name: request-duration-p99
        templateRef:
          name: request-duration-p99
          namespace: default
        thresholdRange:
          max: 500
        interval: 1m
```

The `name` field under `metrics` is an arbitrary label for this metric check. The `templateRef` points to the MetricTemplate resource. The `thresholdRange.max` of 500 means the query result must be at most 500 milliseconds for the check to pass.

## Adapting the Query for Linkerd

If you are running Linkerd instead of Istio, the underlying Prometheus metric names differ. Here is a MetricTemplate for Linkerd:

```yaml
apiVersion: flagger.app/v1beta1
kind: MetricTemplate
metadata:
  name: request-duration-p99-linkerd
  namespace: default
spec:
  provider:
    type: prometheus
    address: http://prometheus.linkerd-viz:9090
  query: |
    histogram_quantile(0.99,
      sum(rate(
        response_latency_ms_bucket{
          namespace="{{ namespace }}",
          deployment="{{ target }}",
          direction="inbound"
        }[{{ interval }}]
      )) by (le)
    )
```

The key differences are the metric name (`response_latency_ms_bucket` for Linkerd versus `istio_request_duration_milliseconds_bucket` for Istio) and the label selectors.

## Tuning Thresholds and Intervals

Choosing the right P99 threshold depends on your service. A few considerations:

- Set the threshold based on your SLO. If your SLO requires P99 latency under 300ms, set `thresholdRange.max` to 300.
- Use a metric interval that matches or exceeds your analysis interval. A 1-minute metric interval with a 1-minute analysis interval means each check evaluates the most recent minute of traffic.
- A shorter metric interval increases sensitivity to brief latency spikes, while a longer interval smooths out transient noise.
- Combine the duration metric with a success rate metric for comprehensive canary evaluation.

```yaml
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration-p99
        templateRef:
          name: request-duration-p99
          namespace: default
        thresholdRange:
          max: 500
        interval: 1m
```

This configuration requires both a 99% success rate and P99 latency under 500ms for the canary to advance.

## Conclusion

Adding P99 request duration to your Flagger canary analysis is essential for catching latency regressions that success rate metrics alone would miss. Whether you use Flagger's built-in `request-duration` metric with a supported provider or define a custom MetricTemplate with a Prometheus query, the process is straightforward. The key decisions are choosing an appropriate latency threshold based on your SLOs and combining duration metrics with error rate metrics for thorough canary evaluation.
